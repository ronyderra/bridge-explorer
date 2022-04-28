
import BigNumber from 'bignumber.js';
import  { Algodv2, Indexer} from 'algosdk';
import config from '../config'
/// ALGORAND


export async function assetUrlFromId(algodClient:any ,assetId: number): Promise<string> {
    const asset = await algodClient.getAssetByID(assetId).do();
    return asset['params']['url'];
}

export function getAlgodClient(host: string, apiKey: string) {
    return new Algodv2({
        'x-api-key': apiKey
    }, host, "");
}

export function getAlgodIndexer(host: string, apiKey: string) {
    return new Indexer({
        'x-api-key': apiKey
    }, host, "");
}

export const b64Decode = (raw: string) => Buffer.from(raw, 'base64');

export const bigIntFromBe = (buf: Buffer) =>
    new BigNumber(`0x${buf.toString('hex')}`, 16);

export const fixActionId = (id:string, nonce:string) => {
    let chain = config.web3.find((chain) => chain.nonce === nonce);

    if (!chain) {

    for (const key of ["elrond", "tezos", "algorand"]) {
        //@ts-ignore
        if (nonce == config[key].nonce) {
          //@ts-ignore
          return config[key].name;
        }
      }

    }
}