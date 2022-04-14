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

  public async getDepTrxInfo(trx: string, chainName: string) {
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
          console.log(parsed);
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
      console.log(descs);
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

  public async getDestTrxInfo(trx: string, chainName: string) {
    const node = config.web3.find((c) => c.name === chainName)?.node;
    const minter = config.web3.find((c) => c.name === chainName)?.contract;

    if (!node && !minter) return null;
    console.log('try to connect to ', node);
    try {
      const provider = new JsonRpcProvider(node);
      console.log('got Provider');
      const wait = await provider.waitForTransaction(trx);
      console.log(wait.transactionHash);
      const res = await provider.getTransaction(trx);
      console.log(res.blockHash);

      const contract = Minter__factory.connect(minter!, provider);
      const decoded = contract.interface.parseTransaction(res);
      console.log(decoded);
      const tokenId =
        decoded.name === "validateTransferNft"
          ? decoded.args["nftId"].toString()
          : decoded.args["tokenId"].toString();

          const xpnftMinter = decoded.args["mintWith"]?.toString();
          const originalContractAddress = decoded.args["contractAddr"]?.toString();
      return { tokenId, provider, xpnftMinter, originalContractAddress  };
    } catch (e) {
      console.log(e, "kistro");
      return null;
    }
  }

  //public

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
      fromChain: chainId,
      senderAddress,
      tokenId,
      contract: contractAddress,
      type,
    } = updated;

    if (!this.repo) throw new Error("no initilized");
    console.log(chainId);
    console.log(senderAddress);
    console.log(tokenId);
    console.log(contractAddress);
    if (!chainId || !senderAddress || !tokenId || !contractAddress) {
      return;
    }

    const depNfts = await this.repo.findNFT({
      chainId,
      senderAddress,
    });

    console.log(depNfts?.length);

    let toUpdate = depNfts?.filter(
      (nft) =>
        nft.tokenId === tokenId &&
        nft.contract.toLowerCase() === contractAddress.toLowerCase()
    );

    if (!toUpdate || toUpdate.length > 500 || toUpdate.length === 0) {
      toUpdate && console.log(toUpdate.length, "more than 500 or 0");
      return;
    }

    await this.repo.removeNFT({
      ents: toUpdate,
    });

    const depBridgeContract = config.web3.find(
      (c) => c.name === updated.fromChainName
    )?.contract;

    if (!depBridgeContract) {
      console.log("depBridgeContract");
      return;
    }

    const nft = toUpdate[0];
    const newDoc = new EthNftDto(
      BigInt(nft.chainId),
      BigInt(nft.tokenId),
      depBridgeContract,
      nft.contract,
      nft.contractType!,
      nft.uri,
      nft.name,
      nft.symbol
    );

    await this.repo.createNFT({
      ents: [newDoc],
    });

    console.log("finish updating depNFT");
    console.log(newDoc);

    if (updated.toHash && updated.toChainName) {
      console.log(updated.toHash, "uth");
      console.log(updated.toChainName, "utcn");

      const originalTokenId = await this.getDestTrxInfo(
        updated.toHash,
        updated.toChainName
      );
      console.log(originalTokenId, "originalTokenId");

      const bridgeContract = config.web3.find(
        (c) => c.name === updated.toChainName
      )?.contract;

      console.log(bridgeContract,'bridgeContract');

      if (
        bridgeContract &&
        originalTokenId?.tokenId &&
        updated?.targetAddress
      ) {
        console.log(updated.toChain, 'updated.toChain');
        let nfts = await this.repo.findNFT({
          chainId: updated.toChain!,
          senderAddress: bridgeContract,
          tokenId: originalTokenId.tokenId,

        });

        nfts?.filter(n => {
          if (originalTokenId.xpnftMinter) {
            return n.contract.toLowerCase() === originalTokenId.xpnftMinter.toLowerCase()
          } else {
            return n.contract.toLowerCase() === originalTokenId.originalContractAddress.toLowerCase()
          }
        })

        console.log(nfts,' nfts after filter');

        if (!nfts || nfts?.length > 500) {
          console.log("more than 500 in target chain");
          return;
        }
        console.log(nfts.length);
        if (nfts.length === 0) {
          await delay(1000);
          try {
            const erc7 = UserNftMinter__factory.connect(
              originalTokenId.xpnftMinter,
              originalTokenId.provider
            );
              console.log(erc7.address,'erc7.address');
    
            const [uri, name, symbol] = await Promise.allSettled([
              erc7.tokenURI(originalTokenId.tokenId),
              erc7.name(),
              erc7.symbol()
            ]);

            console.log(uri, name, symbol );

            if (
              uri.status === "fulfilled" &&
              name.status === "fulfilled" &&
              symbol.status === "fulfilled"
            ) {

              const alreadyExist = await this.repo.findNFT({
                tokenId:originalTokenId.tokenId,
                chainId: updated.toChain!,
                senderAddress: updated.targetAddress!
              })

              if (alreadyExist && alreadyExist.length > 0) {
                console.log('already exist', alreadyExist[0].tokenId);
                return 
              }

              const createdTagetNft = new EthNftDto(
                BigInt(updated.toChain!),
                BigInt(originalTokenId.tokenId),
                updated.targetAddress!,
                contractAddress,
                newDoc.contractType!,
                uri.value,
                name.value,
                symbol.value
              );

              await this.repo.createNFT({
                ents: [createdTagetNft],
              });
              console.log(createdTagetNft, 'newCreated');
        
            }
            return
          } catch (e) {
            console.log(e, "onCreating new");
            return
          }
        }

        await this.repo.removeNFT({
          ents: nfts,
        });

        const targetNft = nfts.find(n => n.chainId && n.tokenId && n.contract && n.contractType && n.symbol && n.name && n.uri);
        console.log(nfts, 'targetNft');
        if (!targetNft) return
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

        console.log(newTagetNft, "newTagetNft");

        await this.repo.createNFT({
          ents: [newTagetNft],
        });

        console.log("finishing updating target chain");
      } else {
        console.log("no bridgeContract or originalTokenId");
        console.log(bridgeContract);
        console.log(originalTokenId);
        console.log(updated.targetAddress);
      }
    }
  }
}
