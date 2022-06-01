import WebSocket from "ws";
import { Base64 } from "js-base64";
import BigNumber from "bignumber.js";
import { IContractEventListener } from "./old";
import { EvResp } from "../entities/EvResp";
import { IEventRepo } from "../db/repo";
import config, { chainNonceToName } from "../config";
import axios, { AxiosError, AxiosInstance } from "axios";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { BridgeEvent, IEvent } from "../entities/IEvent";
import { io } from "socket.io-client";
import { clientAppSocket } from "../index";
import { TransactionDecoder, TransactionMetadata } from "@elrondnetwork/transaction-decoder";
import Web3 from "web3";
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
  SmartContract,
  TransactionPayload,
  U64Value,
  VariadicValue,
  BigIntType,
} from "@elrondnetwork/erdjs";
import { MikroORM, IDatabaseDriver, Connection, wrap, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../db/repo";
import { TransactionWatcher } from "@elrondnetwork/erdjs/out/transactionWatcher";
import { eventFromTxn, bigIntFromBeElrd, getFrozenTokenAttrs } from "./helpers";
import { executedEventHandler } from "./handlers";
import { Minter__factory } from "xpnet-web3-contracts";
const elegantPair = require('elegant-pair');
const util = require("util");

const elrondSocket = io(config.elrond.socket);
const executedSocket = io(config.socketUrl);

const provider = new ProxyProvider(config.elrond.node);

const providerRest = axios.create({ baseURL: config.elrond.api });
const minterAddr = new Address(config.elrond.contract);


// TODO: Save bridge events to db
export  function elrondEventListener(
  em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {
  /*eventFromTxn('ffa8103ab5acd4bcc60582c1d1014c5d7277809fa4b008ee2ea6b0900c46a6a3', provider, providerRest).then((evs) => {
  evs?.evs!.forEach(async (e) => {

    if (e.address != config.elrond.contract) {
      return undefined;
    }

    if (e.topics.length < 5) return


   

    //@ts-ignore
    console.log(Base64.decode(null));
  })
});*/



  return {
    listen: async () => {

    /*  let num = 0
      while (3> 2) {

        //freezeSendNft
        //validateSendNft
        //WithdrawNft
      const trxs = (await providerRest.get(`/transactions?function=WithdrawNft&from=${String(num)}&receiver=` + config.elrond.contract)).data;
 
      //provider.f
    for (const trx of trxs) {
      let transactionOnNetwork = await provider.getTransaction(new TransactionHash(trx.txHash))

      let metadata = new TransactionDecoder().getTransactionMetadata({
        sender: transactionOnNetwork.sender.toString(),
        receiver: transactionOnNetwork.receiver.toString(),
        data:  btoa(transactionOnNetwork.data.toString()),
        value: '0',
        type: transactionOnNetwork.type.toString()

    });

    const ai = new BigNumber(metadata.functionArgs[0], 16).toString(10);

    const doc = await em.findOne(BridgeEvent, {
      actionId: ai,
      fromChain: '2'
    })

    if (doc) {
      console.log(doc);
    }


   /* const doc = await em.findOne(BridgeEvent, {
      actionId: String(xy[0]),
      fromChain: String(xy[1])
    })
    
    if (doc && !doc.toHash) {
     
  
      wrap(doc).assign({
        toHash: trx.txHash
      }, {em})


     false && await em.flush()

      console.log(trx.txHash);
    }

  }

    num +=24

      }

*/
   
  
      elrondSocket.on("elrond:bridge_tx", async (fromHash: string) => {


        try {
          // console.log(fromHash, "fromHash");

          const event = await eventFromTxn(fromHash, provider, providerRest);

          if (!event) return;

          event.evs.length &&
            event.evs.forEach(async (e) => {
              if (e.topics.length < 5) {
                return undefined;
              }
              if (e.address != config.elrond.contract) {
                return undefined;
              }

              const action_id = bigIntFromBeElrd(
                Base64.toUint8Array(e.topics[1])
              );
              const tx_fees = bigIntFromBeElrd(
                Base64.toUint8Array(e.topics[e.topics.length - 1])
              );

              // console.log({
              //   action_id: action_id.toString(),
              //   tx_fees: tx_fees.toString(),
              // });

              // console.log(e.topics);

              const to = Base64.atob(e.topics[3]); //
              const nftMinterContact = Base64.decode(e.topics[4]); //
              let uri = "";
              let tokenId = "";
              let chain_nonce = new Uint32Array(
                Base64.toUint8Array(e.topics[2])
              )[0]; //
              const nonce = bigIntFromBeElrd(Base64.toUint8Array(e.topics[6]));

              // console.log({
              //   chain_nonce,
              //   nftMinterContact,
              //   nonce,
              // });

              let type = "Unfreeze";

              switch (e.identifier) {
                case "withdrawNft": {
                  type = "Unfreeze";

                  uri = Base64.decode(e.topics[5]); //
                  const wrappedData = await axios.get<IERC721WrappedMeta>(uri);
                  tokenId = wrappedData?.data?.wrapped?.tokenId;

                  break;
                }
                case "freezeSendNft": {
                  type = "Transfer";
                  tokenId = Base64.decode(e.topics[5]);

                  const name = Base64.decode(e.topics[7]);
                  uri = Base64.decode(e.topics[8]);
                  const [attrs, metadataUrl] = await getFrozenTokenAttrs(
                    tokenId,
                    nonce
                  );

                  // console.log({
                  //   name,
                  //   metadataUrl,
                  //   attrs,
                  // });
                  break;
                }
              }

              const eventObj: IEvent = {
                actionId: action_id?.toString(),
                chainName: "ELROND",
                tokenId,
                fromChain: "2",
                toChain: chain_nonce?.toString(),
                fromChainName: chainNonceToName("2"),
                toChainName: chainNonceToName(nonce?.toString()) || "",
                fromHash,
                txFees: tx_fees?.toString(),
                type,
                status: "Pending",
                toHash: "",
                senderAddress: event.sender,
                targetAddress: to,
                nftUri: uri || "",
                createdAt:  new Date()
              };

              // console.log("transfer event: ", eventObj);

              Promise.all([
                (async () => {
                  return await createEventRepo(em.fork()).createEvent(eventObj);
                })(),
                (async () => { })(),
              ]).then(([doc]) => {
                // console.log(doc, "doc");
                clientAppSocket.emit("incomingEvent", doc);
              });
            });
        } catch (e) {
          console.log(e, "elrond Error");
        }
      });

      executedSocket.on(
        "tx_executed_event",
        async (
          fromChain: number,
          toChain: number,
          action_id: string,
          hash: string
        ) => {
          if (!fromChain || fromChain.toString() !== config.elrond.nonce)
            return;
          // console.log(
          //   {
          //     toChain,
          //     fromChain,
          //     action_id,
          //     hash,
          //   },
          //   "elrond:tx_executed_event"
          // );

          executedEventHandler(em.fork(), fromChain.toString())({
            toChain,
            fromChain,
            action_id,
            hash,
          })
        }
      );

      // setTimeout(
      //   () => console.log(elrondSocket.connected && "Listening to Elrond"),
      //   1000
      // );
    },
  };
}

export type Erc721Attrs = {
  trait_type: string;
  value: string;
};

/*

const eventHandler = async (
  event: EvResp,
  chainName: string,
  chainNonce: string,
  eventRepo: IEventRepo
) => {
  if (event.topics.length < 5) {
    return undefined;
  }


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
      const doc = await createEventRepo(em.fork()).createEvent(eventObj);
      clientAppSocket.emit("incomingEvent", doc);
      setTimeout(async () => {
        const updated = await createEventRepo(em.fork()).errorEvent(action_id.toString(),chainNonce);
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
      const doc = await createEventRepo(em.fork()).createEvent(eventObj);
      clientAppSocket.emit("incomingEvent", doc);
      setTimeout(async () => {
        const updated = await createEventRepo(em.fork()).errorEvent(action_id.toString(),chainNonce);
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
*/
