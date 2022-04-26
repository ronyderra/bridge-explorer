import { IndexerRepo } from "../db/indexerRepo";
import { EthNftDto } from "../entities/NftIndex";
import config from "../config";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
import { chainNonceToName } from "../config";
import BigNumber from "bignumber.js";
import { delay } from "../db/helpers";
import { BridgeEvent } from "../entities/IEvent";

export default class IndexUpdater {
  public static instance: IndexUpdater;
  private repo: IndexerRepo;

  constructor(repo: IndexerRepo) {
    if (IndexUpdater.instance) {
      this.repo = repo;
      return IndexUpdater.instance;
    }

    this.repo = repo;
    IndexUpdater.instance = this;
  }

  public async getDepTrxData(trx: string, chainName: string) {
    const node = config.web3.find((c) => c.name === chainName)?.node;
    const minter = config.web3.find((c) => c.name === chainName)?.contract;

    const provider = new JsonRpcProvider(node);

    try {
      const res = await provider.waitForTransaction(trx);

      const contract = Minter__factory.connect(minter!, provider);

      const descs = res.logs.flatMap((log) => {
        if (log.address != minter) {
          return [];
        }
        try {
          const parsed = contract.interface.parseLog(log);

          return parsed;
        } catch (_) {
          console.log(_);
          return [];
        }
      });

      if (descs[0].name === "UnfreezeNft") {
        return {
          tokenId: descs[0].args["tokenId"].toString(),
          contractAddr: descs[0].args["burner"].toString(),
        };
      }

      return {
        tokenId: descs[0].args["id"].toString(),
        contractAddr: descs[0].args["contractAddr"].toString(),
      };
    } catch (e) {
      return {
        tokenId: "",
        contractAddr: "",
      };
    }
  }

  public async getDestTrxData(trx: string, chainName: string) {
    const node = this.getNodeRpc(chainName);
    const minter = this.getMinterContract(chainName);

    if (!node && !minter) return null;

    try {
      const provider = new JsonRpcProvider(node);

      const wait = await provider.waitForTransaction(trx);
      console.log(wait.transactionHash, "trxHash");
      const res = await provider.getTransaction(trx);
      console.log(res.blockHash, "blockHash");

      const contract = Minter__factory.connect(minter!, provider);
      const decoded = contract.interface.parseTransaction(res);

      const tokenId =
        decoded.name === "validateTransferNft"
          ? decoded.args["nftId"].toString()
          : decoded.args["tokenId"].toString();

      const bridgeMinter = decoded.args["mintWith"]?.toString();
      const originalContractAddress = decoded.args["contractAddr"]?.toString();

      return { tokenId, provider, bridgeMinter, originalContractAddress };
    } catch (e) {
      console.log(e, "kistro");
      return null;
    }
  }

  private async getNfts(chainId: string, address: string, tokenId?: string) {
    try {
      const nfts = await this.repo.findNFT({
        chainId,
        address,
        tokenId,
      });
      return nfts ? nfts : [];
    } catch (e) {
      console.log(e, "in getNfts");
      return [];
    }
  }

  private getMinterContract = (chainName: string) =>
    config.web3.find((c) => c.name === chainName)?.contract;
  private getNodeRpc = (chainName: string) =>
    config.web3.find((c) => c.name === chainName)?.node;

  public async createDefault() {
    const newNft = new EthNftDto(
      BigInt("7"),
      BigInt("30431109045241522795830634386"),
      "0x47Bf0dae6e92e49a3c95e5b0c71422891D5cd4FE",
      "0x61f4A37676700F6E9bcbAeb05FF6c2f701c1c702",
      "ERC721",
      "https://pinata.buzz/ipfs/QmTjnBS4muiHeYLMj6RpyikY2Vo7dBUMBtaqj9NbXPuRVF/lootjson/0/7210.json",
      "WNFT",
      "Wrapped NFT"
    );

    await this.repo.createNFT({ ents: [newNft] }).catch((e) => console.log(e));
  }


  

  public async update(updated: BridgeEvent) {
    const {
      fromChain,
      senderAddress,
      tokenId,
      contract: contractAddress,
    } = updated;

    if (!this.repo) throw new Error("no initilized");
    console.log(fromChain);
    console.log(senderAddress);
    console.log(tokenId);
    console.log(contractAddress);
    if (
      !fromChain ||
      !senderAddress ||
      !tokenId ||
      !contractAddress ||
      !updated.fromChainName ||
      !updated.toHash ||
      !updated.toChainName
    ) {
      console.log(
        "missing paramg",
        fromChain,
        senderAddress,
        tokenId,
        contractAddress,
        updated.fromChainName,
        updated.toHash,
        updated.toChainName
      );
      return;
    }

    let depChainNfts = await this.getNfts(fromChain, senderAddress);

    if (depChainNfts?.length === 0 && updated.type === "Unfreeze") {
      depChainNfts = await this.getNfts(
        fromChain,
        "0x0000000000000000000000000000000000000000",
        tokenId
      );
    }

    depChainNfts = depChainNfts.filter(
      (nft) =>
        nft.tokenId === tokenId &&
        nft.contract.toLowerCase() === contractAddress.toLowerCase()
    );

    if (depChainNfts.length === 0) {
      console.log(
        `Nft ${tokenId}/${contractAddress}/${senderAddress} not found when try to clean up departure chain - ${updated.fromChainName}`
      );
      return;
    }

    await this.repo.removeNFT({
      ents: depChainNfts,
    });

    const minterContract = this.getMinterContract(updated.fromChainName);

    if (!minterContract) {
      console.log("cant find minterContract");
      return;
    }

    const ownedByBridge = new EthNftDto(
      BigInt(depChainNfts[0].chainId),
      BigInt(depChainNfts[0].tokenId),
      minterContract,
      depChainNfts[0].contract,
      depChainNfts[0].contractType!,
      depChainNfts[0].uri,
      depChainNfts[0].name,
      depChainNfts[0].symbol
    );

    await this.repo.createNFT({
      ents: [ownedByBridge],
    });

    console.log("finish updating deparureNFTs");
    console.log(ownedByBridge);

    console.log(updated.toHash, "toHash");
    console.log(updated.toChainName, "toChainName");

    const destTrxData = await this.getDestTrxData(
      updated.toHash,
      updated.toChainName
    );

    if (destTrxData?.provider || !destTrxData?.tokenId) {
      console.log(
        "missing some data of destination trx",
        destTrxData?.originalContractAddress,
        destTrxData?.provider,
        destTrxData?.tokenId,
        destTrxData?.bridgeMinter
      );
      return;
    }

    const desMinterContract = this.getMinterContract(updated.toChainName);

    console.log(desMinterContract, "desMinterContract");

    if (
      desMinterContract &&
      destTrxData?.tokenId &&
      updated?.targetAddress &&
      updated.toChain
    ) {
      console.log(updated.toChain, "updated.toChain");
      let destNfts = await this.getNfts(updated.toChain, desMinterContract);

      destNfts = destNfts?.filter((nft) => {
        if (destTrxData.bridgeMinter) {
          return (
            nft.contract.toLowerCase() ===
              destTrxData.bridgeMinter.toLowerCase() &&
            nft.tokenId === destTrxData.tokenId
          );
        } else {
          return (
            nft.contract.toLowerCase() ===
              destTrxData.originalContractAddress.toLowerCase() &&
            nft.tokenId === destTrxData.tokenId
          );
        }
      });

      if (destNfts?.length > 500) {
        console.log("more than 500 in target chain");
        return;
      }

      if (destNfts.length === 0) {
        //await delay(1000);
        console.log('no leftovers');
        const erc7 = UserNftMinter__factory.connect(
          destTrxData.bridgeMinter
            ? destTrxData.bridgeMinter
            : destTrxData.originalContractAddress,
          destTrxData.provider
        );

        const [uri, name, symbol] = await Promise.allSettled([
          erc7.tokenURI(destTrxData.tokenId),
          erc7.name(),
          erc7.symbol(),
        ]);

        if (
          uri.status === "fulfilled" &&
          name.status === "fulfilled" &&
          symbol.status === "fulfilled"
        ) {
          console.log(uri.value, name.value, symbol.value);

          const alreadyExist = await (
            await this.getNfts(
              updated.toChain,
              updated.targetAddress,
              destTrxData.tokenId
            )
          ).filter((nft) => nft.contract === contractAddress);

          if (alreadyExist.length > 0) {
            console.log("already exist", alreadyExist[0].tokenId);
            return;
          }

          const createdTagetNft = new EthNftDto(
            BigInt(updated.toChain!),
            BigInt(destTrxData.tokenId),
            updated.targetAddress!,
            contractAddress,
            ownedByBridge.contractType!,
            uri.value,
            name.value,
            symbol.value
          );

          await this.repo.createNFT({
            ents: [createdTagetNft],
          });
          console.log(createdTagetNft, "finish creating destinationNFTs");
        }

        return;
      }

      console.log('removing leftovers');
      await this.repo.removeNFT({
        ents: destNfts,
      });

      const targetNft = destNfts.find(
        (nft) =>
          nft.chainId &&
          nft.tokenId &&
          nft.contract &&
          nft.contractType &&
          nft.symbol &&
          nft.name &&
          nft.uri
      );
      console.log(targetNft, "targetNft");
      if (!targetNft) return;

      const newTagetNft = new EthNftDto(
        BigInt(targetNft.chainId),
        BigInt(targetNft.tokenId),
        updated.targetAddress,
        targetNft.contract,
        targetNft.contractType!,
        targetNft.uri,
        targetNft.name,
        targetNft.symbol
      );

      await this.repo.createNFT({
        ents: [newTagetNft],
      });

      console.log(newTagetNft, "finish updating destinationNFTs");
    } else {
      console.log("no bridgeContract or originalTokenId");
      console.log(updated.targetAddress);
    }
  }
}
