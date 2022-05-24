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
//@ts-expect-error no types, cope
import TronWeb from "tronweb";
import { eventHandler } from "./handlers";
import { executedEventHandler } from "./handlers";
import Bottleneck from "bottleneck";
import { IEventhandler } from "./handlers";
const util = require("util");

const executedSocket = io(config.socketUrl);
const notifier = io(config.web3socketUrl);
//const executedSocket = io("https://testnet-tx-socket.herokuapp.com");

const rateLimit = new Bottleneck({
  reservoir: 300,
  reservoirRefreshAmount: 300,
  reservoirRefreshInterval: 1000,
  minTime: 4,
  maxConcurrent: 15,
});

export function TronEventListener(
  eventRepo: IEventRepo
): IContractEventListener {
  return {
    async listen() {
      console.log("listentin to tron");
      console.log(config.tron);
      const provider = new TronWeb({
        fullHost: config.tron.node,
        privateKey: "111",
        headers: config.tron.apiKey && {
          "TRON-PRO-API-KEY": config.tron.apiKey,
        },
      });

      const minter = await provider.contract(
        Minter__factory.abi,
        config.tron.contract
      );

      async function getRawEventFromTxn(
        hash: string,
        retries = 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ): Promise<any[] | undefined> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any[] = await rateLimit.schedule(() =>
          provider.getEventByTransactionID(hash)
        );

        if (res.length !== 0) {
          return res;
        }
        if (retries > 15) {
          return undefined;
        }
        await new Promise((r) => setTimeout(r, 3000));
        return await getRawEventFromTxn(hash, retries + 1);
      }

      async function txToEvent(hash: string): Promise<any> {
        const evs = await getRawEventFromTxn(hash);
        if (evs === undefined) {
          console.warn("TRON: ignoring event", hash);
          return undefined;
        }

        return evs.filter((ev) => ev.contract === config.tron.contract);
      }

      console.log(
        provider.address.fromHex("41096eb8a6765e8293e90d5a624c079bd86cbcec8f")
      );

      console.log(
        (
          await provider.trx.getTransaction(
            "365f0d512bf974a6ce783d900bd110e1d7e009625bc30ed5ebabc6b02bdb1617"
          )
        )["raw_data"].contract[0].parameter.value
      );

      //console.log(res);

      notifier.on("tron:bridge_tx", async (hash: string) => {
        /*const evs = await txToEvent(hash);
        
        if (evs.length) {
            
            for (const ev of evs) {

                const evData:IEventhandler = {
                    actionId: String(ev.result['actionId']),
                    from: config.tron.nonce,
                    to: String(ev.result['chainNonce']),
                    sender: 
                }

                eventHandler(eventRepo)({
                    actionId: String(res.result["actionId"]),
                    from: "9",
                    to: String(res.result["chainNonce"]),
                    sender: trx.from,
                    target: String(res.result["to"]),
                    hash: "",
                    txFees: String(res.result["txFees"]),
                    tokenId: tokenId,
                    type: "Transfer",
                    uri: String(res.result["tokenData"]),
                    contract: String(res.result["burner"]),
                  });

            }


          
        }*/
      });

      /*minter.TransferErc721().watch(
        async (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          err: any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          res: any
        ) => {
          console.log(err, "err");
          console.log("transfer");
          console.log(util.inspect(res, false, null, true));

          const tokenId = res.result["id"].toString();

          const trx = await res.result["event"]?.getTransaction();

          console.log({
            actionId: String(res.result["actionId"]),
            from: "9",
            to: String(res.result["chainNonce"]),
            sender: trx.from,
            target: String(res.result["to"]),
            hash: trx.hash,
            txFees: String(res.result["txFees"]),
            tokenId: tokenId,
            type: "Transfer",
            uri: res.result["tokenData"],
            contract: String(res.result["burner"]),
          });

          eventHandler(eventRepo)({
            actionId: String(res.result["actionId"]),
            from: "9",
            to: String(res.result["chainNonce"]),
            sender: trx.from,
            target: String(res.result["to"]),
            hash: "",
            txFees: String(res.result["txFees"]),
            tokenId: tokenId,
            type: "Transfer",
            uri: String(res.result["tokenData"]),
            contract: String(res.result["burner"]),
          });
        }
      );

      minter.UnfreezeNft().watch(
        async (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          err: any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          res: any
        ) => {
          if (err) {
            console.log(err, "err");
            return;
          }
          console.log("unfreeze");
          console.log(util.inspect(res, false, null, true));

          const trx = await res.result["event"]?.getTransaction();

          console.log({
            actionId: String(res.result["actionId"]),
            from: "9",
            to: String(res.result["chainNonce"]),
            sender: "",
            target: String(res.result["to"]),
            hash: trx.hash,
            txFees: String(res.result["txFees"]),
            tokenId: String(res.result["tokenId"]),
            type: "Unfreeze",
            uri: String(res.result["baseURI"]),
            contract: String(res.result["burner"]),
          });

          eventHandler(eventRepo)({
            actionId: String(res.result["actionId"]),
            from: "9",
            to: String(res.result["chainNonce"]),
            sender: trx.from,
            target: String(res.result["to"]),
            hash: trx.hash,
            txFees: String(res.result["txFees"]),
            tokenId: String(res.result["tokenId"]),
            type: "Unfreeze",
            uri: String(res.result["baseURI"]),
            contract: String(res.result["burner"]),
          });
        }
      );*/

      executedSocket.on(
        "tx_executed_event",
        async (
          fromChain: number,
          toChain: number,
          action_id: string,
          hash: string
        ) => {
          executedEventHandler(
            eventRepo,
            "9"
          )({
            fromChain,
            toChain,
            action_id,
            hash,
          });
        }
      );
    },
  };
}
