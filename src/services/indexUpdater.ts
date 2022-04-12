import { IndexerRepo } from "../db/indexerRepo";
import { EthNftDto } from "../entities/NftIndex";
import config from "../config";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
import { chainNonceToName } from "../config";
import BigNumber from "bignumber.js";


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

  public async getTrxInfo(trx: string, chainName: string) {
    const node = config.web3.find((c) => c.name === chainName)?.node;
    const minter = config.web3.find((c) => c.name === chainName)?.contract;
    const provider = new JsonRpcProvider(node);

    console.log(
      "Connection to Node: ",
      (await provider.getNetwork()).name,
      node,
      "established."
    );

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
        return [];
      }
    });

    return {
        tokenId: descs[0].args["id"].toString(),
        contractAddr: descs[0].args["contractAddr"].toString()
    }
  }

  public async createDefault() {
      const newNft = new EthNftDto(
        BigInt('4'),
        BigInt('10000098204'),
        '0x0B7ED039DFF2b91Eb4746830EaDAE6A0436fC4CB',
        '0x85F0e02cb992aa1F9F47112F815F519EF1A59E2D',
        'ERC721',
        'https://meta.polkamon.com/meta?id=10000098204',
        'PolkamonOfficialCollection',
        'PMONC'
      )

      await this.repo.createNFT({ents: [newNft]}).catch((e) => console.log(e))
  }

  public async update(
    chainId: string | undefined,
    senderAddress: string | undefined,
    tokenId: string | undefined,
    contractAddress: string | undefined
  ) {
    if (!this.repo) throw new Error("no initilized");
    console.log(chainId);
    console.log(senderAddress);
    console.log(tokenId);
    console.log(contractAddress);
    if (!chainId || !senderAddress || !tokenId || !contractAddress) {
       return
    }

    const nfts = await this.repo.findNFT({
      chainId,
      senderAddress,
    });

    console.log(nfts);

    let toUpdate = nfts?.filter(
      (nft) =>
        nft.tokenId === tokenId &&
        nft.contract.toLowerCase() === contractAddress.toLowerCase()
    );

    console.log(toUpdate);

    if (toUpdate && toUpdate.length === 1) {
        console.log('go');
      try {
        await this.repo.removeNFT({
          ents: toUpdate,
        });

        console.log(toUpdate, 'after removal');

        toUpdate = toUpdate.map((nft) => {
          return {
            ...nft,
            owner:
              config.web3.find((c) => chainNonceToName(chainId) === c.name)?.contract || nft.owner,
          };
        });

        console.log(toUpdate, 'after update');

        await this.repo.createNFT({
            ents: toUpdate.map((nft) => new EthNftDto(
                BigInt(nft.chainId),
                BigInt(nft.tokenId),
                nft.owner,
                nft.contract,
                nft.contractType!,
                nft.uri,
                nft.name,
                nft.symbol
            ))
        })

        console.log('after save');
        
      } catch (e: any) {
        console.log(e);
      }
    }
  }
}
