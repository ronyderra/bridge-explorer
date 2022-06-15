import BigNumber from "bignumber.js";
import { Algodv2, Indexer } from "algosdk";
import { EvResp } from "./Intrerfaces/EvResp";
import { AxiosError, AxiosInstance } from "axios";
import { TransactionHash, ProxyProvider } from "@elrondnetwork/erdjs";
import { TransactionWatcher } from "@elrondnetwork/erdjs/out/transactionWatcher";
import { Erc721Attrs } from "./listeners/Elrond/elrond";

/// ALGORAND
export async function assetUrlFromId(
  algodClient: any,
  assetId: number
): Promise<string> {
  const asset = await algodClient.getAssetByID(assetId).do();
  return asset["params"]["url"];
}

export function getAlgodClient(host: string, apiKey: string) {
  return new Algodv2(
    {
      "x-api-key": apiKey,
    },
    host,
    ""
  );
}

export function getAlgodIndexer(host: string, apiKey: string) {
  return new Indexer(
    {
      "x-api-key": apiKey,
    },
    host,
    ""
  );
}

export const b64Decode = (raw: string) => Buffer.from(raw, "base64");

export const bigIntFromBe = (buf: Buffer) =>
  new BigNumber(`0x${buf.toString("hex")}`, 16);

//ELROND

export async function getFrozenTokenAttrs(
  token: string,
  nonce: BigNumber
): Promise<[Erc721Attrs[] | undefined, string | undefined]> {
  //@ts-ignore
  const tokenInfo = await provider.getAddressNft(minterAddr, token, nonce);
  let metadataUrl: undefined | string = tokenInfo.uris[1];
  if (!tokenInfo.attributes?.length) {
    return [undefined, metadataUrl];
  }
  const attrs = Buffer.from(tokenInfo.attributes, "base64").toString("utf-8");
  if (attrs.includes("\ufffd")) {
    return [
      [
        {
          trait_type: "Base64 Attributes",
          value: tokenInfo.attributes,
        },
      ],
      metadataUrl,
    ];
  }
  const splitAttrs: Erc721Attrs[] = attrs.split(";").map((v: string, i) => {
    const res: Array<string> = v.split(":");
    if (res.length == 2) {
      if (res[0] == "metadata") {
        if (res[1].startsWith("http") || res[1].startsWith("ipfs")) {
          metadataUrl = res[1];
        } else {
          metadataUrl = `ipfs://${res[1]}`;
        }
      }
      return {
        trait_type: res[0],
        value: res[1],
      };
    } else if (res.length == 1) {
      return {
        trait_type: `Attr #${i}`,
        value: res[0],
      };
    } else {
      return {
        trait_type: res[0],
        value: res.slice(1).join(":"),
      };
    }
  });

  return [splitAttrs, metadataUrl];
}

export async function eventFromTxn(
  txHash: string,
  provider: ProxyProvider,
  providerRest: AxiosInstance
): Promise<{ evs: EvResp[]; sender: string } | undefined> {
  let hashSan: TransactionHash;
  try {
    hashSan = new TransactionHash(txHash);
  } catch (_) {
    console.warn("elrond: received invalid txn hash", txHash);
    return undefined;
  }

  const watcher = new TransactionWatcher(hashSan, provider);
  await watcher
    .awaitNotarized()
    .catch((e) =>
      console.warn(`elrond: transaction ${txHash} not notarized, err`, e)
    );

  const apiResp = await providerRest
    .get<{
      data?: { transaction?: { sender: string; logs?: { events?: EvResp[] } } };
    }>(`/transaction/${txHash}?withResults=true`)
    .catch((e: AxiosError) => {
      console.warn("elrond: failed to fetch transaction from API", e.message);
      return undefined;
    });
  if (!apiResp) return undefined;

  const sender = apiResp.data.data?.transaction?.sender || "";

  const evs = apiResp.data.data?.transaction?.logs?.events || [];
  if (!evs?.length) {
    console.warn("elrond: no events found in txn", txHash);
  }
  return { evs, sender };
}

export function bigIntFromBeElrd(buf: Uint8Array): BigNumber {
  // TODO: something better than this hack
  return new BigNumber(`0x${Buffer.from(buf).toString("hex")}`, 16);
}
