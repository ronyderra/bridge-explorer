import { IContractEventListener } from "../../Intrerfaces/IContractEventListener";
import config, { chainNonceToName, getTelegramTemplate } from "../../config";
import { io } from "socket.io-client";
import { clientAppSocket } from "../../index";
import { IEvent } from "../../Intrerfaces/IEvent";
import {b64Decode,bigIntFromBe,getAlgodClient,getAlgodIndexer,assetUrlFromId,} from "./helper";
import { IDatabaseDriver, Connection, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../../business-logic/repo";
import axios from "axios";

const util = require("util");

const executedSocket = io(config.socketUrl);
const algoSocket = io(config.web3socketUrl);
//const executedSocket = io("https://testnet-tx-socket.herokuapp.com");

export function AlgorandEventListener(em: EntityManager<IDatabaseDriver<Connection>>,): IContractEventListener {
  return {
    listen: async () => {const indexerClient = getAlgodIndexer(config.algorand.indexerNode,config.algorand.apiKey);
      const algodClient = getAlgodClient(
        config.algorand.node,
        config.algorand.apiKey
      );

      console.log('listening algorand');

      algoSocket.on("algorand:bridge_tx", async (hash) => {
        const txRes = await indexerClient.lookupTransactionByID(hash).do();
        const txnInfo = txRes["transaction"];
        if (txnInfo == undefined || txnInfo?.logs.length == 0) {
          return;
        }

        if (
          txnInfo["tx-type"] == "appl" &&
          txnInfo["application-transaction"]["application-id"] ==
          config.algorand.contract
        ) {
          const actionType = b64Decode(txnInfo.logs[0]).toString("utf-8");
          // Base64 to big number
          const actionCnt = bigIntFromBe(b64Decode(txnInfo.logs[1])).toString();

          const targetChainNonce = bigIntFromBe(b64Decode(txnInfo.logs[2]))
            .toNumber()
            .toString();

          const to = b64Decode(txnInfo.logs[3]).toString("utf-8");
          const mintWith = b64Decode(txnInfo.logs[4]).toString("utf-8");

          const txnFee = bigIntFromBe(
            b64Decode(txnInfo.logs[txnInfo.logs.length - 1])
          );

          let assetID = "";
          let assetUrl = "";

          switch (actionType) {
            case "action_type:freeze_nft": {
              assetID =
                b64Decode(txnInfo?.logs[5])
                  ?.readBigUInt64BE(0)
                  ?.toString() || "";

              assetUrl = await assetUrlFromId(algodClient, +assetID);
              break;
            }

            case "action_type:withdraw_nft": {
              assetUrl = b64Decode(txnInfo.logs[5]).toString("utf-8");
              break;
            }
          }

          const event: IEvent = {
            chainName: "ALGORAND",
            type:
              actionType === "action_type:freeze_nft" ? "Transfer" : "Unfreeze",
            fromChain: config.algorand.nonce,
            toChain: targetChainNonce,
            fromChainName: "ALGORAND",
            toChainName: chainNonceToName(targetChainNonce),
            actionId: actionCnt,
            txFees: txnFee.shiftedBy(-6).toString(),
            dollarFees: "",
            tokenId: assetID,
            status: "Pending",
            fromHash: hash,
            toHash: undefined,
            targetAddress: to,
            senderAddress: txnInfo["sender"],
            nftUri: assetUrl,
            contract: mintWith,
            createdAt: new Date()
          };

          const [doc] = await Promise.all([
            (async () => {
              return await createEventRepo(em.fork()).createEvent(event);
            })(),
            (async () => { })(),
          ])
          if (doc) {
            console.log("------TELEGRAM FUNCTION-----")
            console.log("doc: ", doc);

            setTimeout(() => clientAppSocket.emit("incomingEvent", doc), Math.random() * 3 * 1000)

            setTimeout(async () => {
              const updated = await createEventRepo(em.fork()).errorEvent(hash);
              clientAppSocket.emit("updateEvent", updated);
              if (updated) {
                try {
                  console.log("before telegram operation")
                 await axios.get(`https://api.telegram.org/bot5524815525:AAEEoaLVnMigELR-dl01hgHzwSkbonM1Cxc/sendMessage?chat_id=-553970779&text=${getTelegramTemplate(doc)}&parse_mode=HTML`);
                } catch (err) {
                  console.log(err)
                }
              }
            }, 1000 * 60 * 20);
          }
        }
      });

      executedSocket.on("tx_executed_event",async (fromChain: number,toChain: number,action_id: string,hash: string) => {
          if (!fromChain || fromChain.toString() !== config.algorand.nonce)
            return;

          console.log(
            {
              toChain,
              fromChain,
              action_id,
              hash,
            },
            "algo:tx_executed_event"
          );

          try {
            const updated = await createEventRepo(em.fork()).updateEvent(
              action_id,
              toChain.toString(),
              fromChain.toString(),
              hash
            );
            if (!updated) return;
            console.log(updated, "updated");

            clientAppSocket.emit("updateEvent", updated);
          } catch (e) {
            console.error(e);
          }
        }
      );
    },
  };
}
