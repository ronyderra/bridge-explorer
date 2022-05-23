import { io } from "socket.io-client"

import { ethers } from "ethers"
import axios from "axios"
import { BigNumber } from "bignumber.js"

import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts"
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers"

import { Algodv2, Indexer } from "algosdk"

import IndexUpdater from "../services/indexUpdater"
import { saveWallet } from "../db/helpers"
import { IEvent } from "../entities/IEvent"
import { io as clientAppSocket } from "../index"
import config, { chainNonceToId, chainNonceToName } from "../config"
import { IEventRepo } from "../db/repo"

import { IContractEventListener } from "./web3"
import {
  b64Decode,
  bigIntFromBe,
  getAlgodClient,
  getAlgodIndexer,
  assetUrlFromId,
} from "./helpers"

const algoSocket = io(config.web3socketUrl)
const executedSocket = io(config.socketUrl)

export function AlgorandEventListener(
  eventRepo: IEventRepo
): IContractEventListener {
  return {
    listen: async () => {
      const indexerClient = getAlgodIndexer(
        config.algorand.indexerNode,
        config.algorand.apiKey
      )
      const algodClient = getAlgodClient(
        config.algorand.node,
        config.algorand.apiKey
      )

      algoSocket.on("algorand:bridge_tx", async (hash) => {
        console.log(hash, "args")
        const txRes = await indexerClient.lookupTransactionByID(hash).do()
        const txnInfo = txRes["transaction"]
        if (txnInfo == undefined || txnInfo?.logs.length == 0) {
          console.log("not trx info")
          return
        }

        if (
          txnInfo["tx-type"] == "appl" &&
          txnInfo["application-transaction"]["application-id"] ==
            config.algorand.contract
        ) {
          console.log("starting data decode")
          const actionType = b64Decode(txnInfo.logs[0]).toString("utf-8")
          // Base64 to big number
          const actionCnt = bigIntFromBe(b64Decode(txnInfo.logs[1])).toString()

          const targetChainNonce = bigIntFromBe(b64Decode(txnInfo.logs[2]))
            .toNumber()
            .toString()

          const to = b64Decode(txnInfo.logs[3]).toString("utf-8")
          const mintWith = b64Decode(txnInfo.logs[4]).toString("utf-8")

          const txnFee = bigIntFromBe(
            b64Decode(txnInfo.logs[txnInfo.logs.length - 1])
          )

          console.log(actionType, "actionType")
          console.log(actionCnt.toString(), "actionCnt")
          console.log(targetChainNonce, "targetChainNonce")
          console.log(to, "to")
          console.log(mintWith, "mintWith")
          console.log(txnFee.toString(), "txnFee")

          switch (actionType) {
            case "action_type:freeze_nft": {
              const assetID = b64Decode(txnInfo.logs[5])
                .readBigUInt64BE(0)
                .toString()
              console.log(assetID, "assetID")

              const assetUrl = await assetUrlFromId(algodClient, +assetID)

              const event: IEvent = {
                chainName: "ALGORAND",
                type:
                  actionType === "action_type:freeze_nft"
                    ? "Transfer"
                    : "Unfreeze",
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
              }

              console.log(event, "event")

              const doc = await eventRepo.createEvent(event)


              clientAppSocket.emit("incomingEvent", doc)

   
              console.log("finish creating new event")
            }
          }
        }
      })

     
    },
  }
}
