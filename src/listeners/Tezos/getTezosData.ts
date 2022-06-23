import axios from "axios";
import createEventRepo from "../../business-logic/repo";
import { BlockRepo } from "../../Intrerfaces/IBlockRepo";
import { IDatabaseDriver, Connection, wrap, EntityManager } from "@mikro-orm/core";
import { BigMapAbstraction, MichelsonMap, TezosToolkit } from "@taquito/taquito";
import { bytes2Char } from "@taquito/utils";

export const getTezosCollectionData = async (hash: string) => {
    try {
        const data = await axios.get(`https://api.tzkt.io/v1/operations/${hash}`)
        if (!data) return;

        const entrypoint = data.data[0].parameter?.entrypoint;
        const tokenId = data.data[0].parameter?.value?.token_id
        
        let contractAdd = "";
        let collectionName = "";

        if (entrypoint === "withdraw_nft") {
            contractAdd = data.data[0].parameter?.value?.burner;
            collectionName = "WNFT";
        } else {
            contractAdd = data.data[1]?.target?.address;
            collectionName = data.data[1]?.target?.alias;
        }

        console.log("tokenId:", tokenId);
        console.log("contractAdd:", contractAdd);
        console.log("collectionName:", collectionName);

        return { tokenId, contractAdd, collectionName }
    } catch (err) {
        console.log(err)
    }
}
export async function getUriFa2(fa2Address: string, tokenId: string , rpc: string): Promise<string> {
  const tezos = new TezosToolkit(rpc);

    const contract = await tezos.contract.at(fa2Address);
    const storage = await contract.storage<{
      token_metadata: BigMapAbstraction;
    }>();

    const tokenStorage = await storage.token_metadata.get<{
      token_info: MichelsonMap<string, string>;
    }>(tokenId);

    const uriFa2 = bytes2Char(tokenStorage!.token_info.get("")!);
    console.log("tezos.ts Line 72 - Uri:", uriFa2)

    return uriFa2;
  }
