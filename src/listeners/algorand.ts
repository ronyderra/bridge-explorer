import { IEventRepo } from "../db/repo";
import { IContractEventListener } from "./old";
import config, { chainNonceToId, chainNonceToName } from "../config";
import { io } from "socket.io-client";
import { clientAppSocket } from "../index";
import { IEvent } from "../entities/IEvent";
import { ethers } from "ethers";
import axios from "axios";
import { BigNumber } from "bignumber.js";
import { saveWallet } from "../db/helpers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
import IndexUpdater from "../services/indexUpdater";
import { Algodv2, Indexer } from "algosdk";
import {
  b64Decode,
  bigIntFromBe,
  getAlgodClient,
  getAlgodIndexer,
  assetUrlFromId,
} from "./helpers";
import { MikroORM, IDatabaseDriver, Connection, wrap, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../db/repo";
const util = require("util");

const executedSocket = io(config.socketUrl);
const algoSocket = io(config.web3socketUrl);
//const executedSocket = io("https://testnet-tx-socket.herokuapp.com");

export function AlgorandEventListener(
  em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {
  return {
    listen: async () => {
      const indexerClient = getAlgodIndexer(
        config.algorand.indexerNode,
        config.algorand.apiKey
      );
      const algodClient = getAlgodClient(
        config.algorand.node,
        config.algorand.apiKey
      );

      // console.log('listening algorand');
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

          Promise.all([
            (async () => {
              return await createEventRepo(em.fork()).createEvent(event);
            })(),
            (async () => await createEventRepo(em.fork()).saveWallet(event.senderAddress,event.targetAddress!)
            )(),
          ]).then(([doc]) => {
            // console.log(doc, "doc");
            clientAppSocket.emit("incomingEvent", doc);
          });
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
          if (!fromChain || fromChain.toString() !== config.algorand.nonce)
            return;

          // console.log(
          //   {
          //     toChain,
          //     fromChain,
          //     action_id,
          //     hash,
          //   },
          //   "algo:tx_executed_event"
          // );

          try {
            const updated = await createEventRepo(em.fork()).updateEvent(
              action_id,
              toChain.toString(),
              fromChain.toString(),
              hash
            );
            if (!updated) return;
            // console.log(updated, "updated");

            clientAppSocket.emit("updateEvent", updated);
          } catch (e) {
            console.error(e);
          }
        }
      );
    },
  };
}
