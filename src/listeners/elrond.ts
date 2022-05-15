import WebSocket from "ws";
import { Base64 } from "js-base64";
import BigNumber from "bignumber.js";
import { IContractEventListener } from "./web3";
import { EvResp } from "../entities/EvResp";
import { IEventRepo } from "../db/repo";
import config, { chainNonceToName } from "../config";
import axios, {AxiosError, AxiosInstance} from "axios";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { IEvent } from "../entities/IEvent";
import { io } from "socket.io-client";
import { io as clientAppSocket } from "../index";
import {
  Account,
  Address,
  AddressValue,
  BigUIntValue,
  BytesValue,
  ContractFunction,
  GasLimit,
  NetworkConfig,
  TokenIdentifierValue,
  Transaction,
  TransactionHash,
  ProxyProvider,
  TransactionPayload,
  U64Value,
  VariadicValue,
  BigIntType
} from '@elrondnetwork/erdjs';

import { TransactionWatcher } from '@elrondnetwork/erdjs/out/transactionWatcher';

const util = require('util')


const elrondSocket = io(config.elrond.socket);
const provider = new ProxyProvider(config.elrond.node);
const providerRest = axios.create({ baseURL: config.elrond.node });
const minterAddr = new Address(config.elrond.contract);

// TODO: Save bridge events to db
export function elrondEventListener(
  eventRepo: IEventRepo
): IContractEventListener {


 /* ws.onopen = () => {
    ws.send(
      JSON.stringify({
        subscriptionEntries: [
          {
            address: contract,
          },
        ],
      })
    );
  };*/


  /**
   * 
   * 'VW5mcmVlemVOZnQ=',
    'GA==',
    'BA==',
    'MHg0N0JmMGRhZTZlOTJlNDlhM2M5NWU1YjBjNzE0MjI4OTFENWNkNEZF',
    'WFBORlQtY2I3NDgy',
    'aHR0cHM6Ly9uZnQueHAubmV0d29yay93LzYyMjBjY2UwMWE1ODExNjFmMTIwMGZiZg==',
    'NfcCUYpf8w=='
   * 
   */



  return {

    listen: async () => {
      elrondSocket.on(
        "elrond:bridge_tx",
        async (
          fromHash: string,
        ) => {
          try {
            console.log(fromHash, 'fromHash');



            const evs = await eventFromTxn(fromHash);

            evs && evs.forEach(async e => {

             

              if (e.topics.length < 5) {
                return undefined;
            }
            if (e.address != config.elrond.contract) {
                return undefined;
            }

  
              const action_id = bigIntFromBe(Base64.toUint8Array(e.topics[1]));
              const tx_fees = bigIntFromBe(
                Base64.toUint8Array(e.topics[e.topics.length - 1])
            );
       

            console.log({
              action_id: action_id.toString(),
              tx_fees: tx_fees.toString(),
            });
           

            console.log(util.inspect(e, false, null, true /* enable colors */));

            switch (e.identifier) {
              case 'withdrawNft': {
                  const to = Base64.atob(e.topics[3]);
                  const burner = Base64.decode(e.topics[4]);
                  const uri = Base64.decode(e.topics[5]);
                  const wrappedData = await axios.get<IERC721WrappedMeta>(uri);
                  console.log({
                    to, burner, uri, wrappedData
                  }, 'withdrawNft');


                  const eventObj: IEvent = {
                    actionId: action_id.toString(),
                    chainName: 'ELROND',
                    tokenId: wrappedData?.data?.wrapped.tokenId,
                    fromChain: '2',
                    toChain: '',
                    fromChainName: chainNonceToName('2'),
                    toChainName: '',
                    fromHash,
                    txFees: tx_fees.toString(),
                    type: "Unfreeze",
                    status: "Pending",
                    toHash: '',
                    senderAddress: "N/A",
                    targetAddress: to,
                    nftUri: "N/A",
                  };
            
                  console.log("transfer event: ", eventObj);
                  const doc = await eventRepo.createEvent(eventObj);
              
              }
              case 'freezeSendNft': {
                  const to = Base64.atob(e.topics[3]);
                  const mintWith = Base64.atob(e.topics[4]);
                  const tokenId = Base64.decode(e.topics[5]);
                  const nonce = bigIntFromBe(
                      Base64.toUint8Array(e.topics[6])
                  );
                  const name = Base64.decode(e.topics[7]);
                  const image = Base64.decode(e.topics[8]);
                  const [attrs, metadataUrl] = await getFrozenTokenAttrs(tokenId, nonce);

                  console.log({
                    to, mintWith, tokenId, nonce, name, image, metadataUrl
                  }, 'freezeSendNft');

                }}
                
                }) 
       
              
          } catch (e: any) {
            console.log(e,'elrond Error');
          }
        }
      );

      setTimeout(() => console.log(elrondSocket.connected && 'Listening to Elrond'), 1000)

    }, 
  };
}

export type Erc721Attrs = {
  trait_type: string;
  value: string;
};


async function getFrozenTokenAttrs(
  token: string,
  nonce: BigNumber,
): Promise<[Erc721Attrs[] | undefined, string | undefined]> {
  //@ts-ignore
  const tokenInfo = await provider.getAddressNft(minterAddr, token, nonce);
  let metadataUrl: undefined | string = tokenInfo.uris[1];
  if (!tokenInfo.attributes?.length) {
      return [undefined, metadataUrl]
  }
  const attrs = Buffer.from(tokenInfo.attributes, "base64").toString("utf-8");
  if (attrs.includes('\ufffd')) {
      return [[{
          trait_type: "Base64 Attributes",
          value: tokenInfo.attributes
      }], metadataUrl];
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
              value: res[1]
          };
      } else if (res.length == 1) {
          return {
              trait_type: `Attr #${i}`,
              value: res[0]
          }
      } else {
          return {
              trait_type: res[0],
              value: res.slice(1).join(":")
          };
      }
  });

  return [splitAttrs, metadataUrl];
}



async function eventFromTxn(txHash: string): Promise<EvResp[] | undefined> {
  let hashSan: TransactionHash;
  try {
      hashSan = new TransactionHash(txHash);
  } catch (_) {
      console.warn('elrond: received invalid txn hash', txHash);
      return undefined;
  }
  const watcher = new TransactionWatcher(hashSan, provider);
  await watcher
      .awaitNotarized()
      .catch((e) =>
          console.warn(
              `elrond: transaction ${txHash} not notarized, err`,
              e
          )
      );

  const apiResp = await providerRest
      .get<{ data?: { transaction?: { logs?: { events?: EvResp[] } } } }>(
          `/transaction/${txHash}?withResults=true`
      )
      .catch((e: AxiosError) => {
          console.warn(
              'elrond: failed to fetch transaction from API',
              e.message
          );
          return undefined;
      });
  if (!apiResp) return undefined;

  const evs = apiResp.data.data?.transaction?.logs?.events;
  if (!evs?.length) {
      console.warn('elrond: no events found in txn', txHash);
  }
  return evs;
}




function bigIntFromBe(buf: Uint8Array): BigNumber {
  // TODO: something better than this hack
  return new BigNumber(`0x${Buffer.from(buf).toString("hex")}`, 16);
}

const eventHandler = async (
  event: EvResp,
  chainName: string,
  chainNonce: string,
  eventRepo: IEventRepo
) => {
  if (event.topics.length < 5) {
    return undefined;
  }

  console.log(util.inspect(event, false, null, true /* enable colors */))

  const action_id = bigIntFromBe(Base64.toUint8Array(event.topics[1]));
  const tx_fees = bigIntFromBe(
    Base64.toUint8Array(event.topics[event.topics.length - 1])
  );

  switch (event.identifier) {
    // case "withdraw": {
    //   const to = Base64.atob(event.topics[3]);
    //   const chain_nonce = new Uint32Array(
    //     Base64.toUint8Array(event.topics[2])
    //   )[0]; // TODO: Consider LO
    //   const value = bigIntFromBe(Base64.toUint8Array(event.topics[4]));
    //   console.log(action_id, chain_nonce, tx_fees, to, value);
    // }
    case "withdrawNft": {
      const to = Base64.atob(event.topics[3]);
      const burner = Base64.decode(event.topics[4]);
      const uri = Base64.decode(event.topics[5]);
      const wrappedData = await axios.get<IERC721WrappedMeta>(uri);
      console.log("wrapped", wrappedData);
      console.log(
        "Unfreez",
        action_id.toString(),
        tx_fees.toString(),
        to,
        Base64.decode(event.topics[3])
      );
      const eventObj: IEvent = {
        actionId: action_id.toString(),
        chainName: chainName,
        tokenId: wrappedData?.data?.wrapped.tokenId,
        fromChain: chainNonce,
        toChain: wrappedData?.data?.wrapped?.origin ?? "N/A",
        fromChainName: chainNonceToName(chainNonce),
        toChainName: chainNonceToName(
          wrappedData?.data?.wrapped?.origin ?? "N/A"
        ),
        txFees: tx_fees.toString(),
        type: "Unfreeze",
        status: "Pending",
        fromHash: "N/A",
        toHash: undefined,
        senderAddress: "N/A",
        targetAddress: to.toString(),
        nftUri: wrappedData?.data?.wrapped?.original_uri,
      };
      console.log("unfreez event: ", eventObj);
      const doc = await eventRepo.createEvent(eventObj);
      clientAppSocket.emit("incomingEvent", doc);
      setTimeout(async () => {
        const updated = await eventRepo.errorEvent(action_id.toString(),chainNonce);
        console.log(updated, 'in errored');
        if (updated) {
          clientAppSocket.emit("updateEvent", updated);
        }
    }, 1000 * 60)
    }
    case "freezeSendNft": {
      const to = Base64.atob(event.topics[3]);
      const chain_nonce = new Uint32Array(
        Base64.toUint8Array(event.topics[2])
      )[0]; // TODO: Consider LO
      const tokenId = Base64.decode(event.topics[4]);
      const nonce = bigIntFromBe(Base64.toUint8Array(event.topics[5]));
      const name = Base64.decode(event.topics[6]);
      const image = Base64.decode(event.topics[7]);

      // TODO: add event to db
      const eventObj: IEvent = {
        actionId: action_id.toString(),
        chainName,
        tokenId: tokenId.toString(),
        fromChain: chainNonce,
        toChain: chain_nonce.toString(),
        fromChainName: chainNonceToName(chainNonce),
        toChainName: chainNonceToName(chain_nonce.toString()),
        fromHash: "N/A",
        txFees: tx_fees.toString(),
        type: "Transfer",
        status: "Pending",
        toHash: undefined,
        senderAddress: "N/A",
        targetAddress: to,
        nftUri: "N/A",
      };

      console.log("transfer event: ", eventObj);
      const doc = await eventRepo.createEvent(eventObj);
      clientAppSocket.emit("incomingEvent", doc);
      setTimeout(async () => {
        const updated = await eventRepo.errorEvent(action_id.toString(),chainNonce);
        console.log(updated, 'in errored');
        if (updated) {
          clientAppSocket.emit("updateEvent", updated);
        }
    }, 1000 * 60)

      console.log(
        "transfer",
        action_id.toString(),
        chain_nonce.toString(),
        tx_fees.toString(),
        to
      );
    }
    default:
      return undefined;
  }
};
