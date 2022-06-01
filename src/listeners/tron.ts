import { IEventRepo } from "../db/repo";
import { IContractEventListener } from "./old";
import config, {getChain} from "../config";
import { io } from "socket.io-client";
//@ts-expect-error no types, cope
import TronWeb from "tronweb";
import { eventHandler } from "./handlers";
import { executedEventHandler } from "./handlers";
import Bottleneck from "bottleneck";
import { IEventhandler } from "./handlers";
import { IDatabaseDriver, Connection, EntityManager, wrap } from "@mikro-orm/core";
import { BridgeEvent } from "../entities/IEvent";

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
  em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {





  return {
    async listen() {
     
      const provider = new TronWeb({
        fullHost: config.tron.node,
        privateKey: "111",
        headers: config.tron.apiKey && {
          "TRON-PRO-API-KEY": config.tron.apiKey,
        },
      });

      //const block =( await  provider.trx.getBlock(41095532))//block_header.raw_data.timestamp

     

     /* console.log(await provider.getEventResult('TWS2dqBEscxGnNKC2jqv9zef38PH4Ea1nb', {
        sinceTimestamp: 1653841089000,
        eventName: 'Transfer'
      }));
     /* console.log((await provider.trx.getBlock(41088395)).transactions.filter((trx:any) => {
       return  trx.raw_data.contract[0].parameter.value['owner_address'] === 'TWS2dqBEscxGnNKC2jqv9zef38PH4Ea1nb' || 
       trx.raw_data.contract[0].parameter.value['to_address'] ===  'TWS2dqBEscxGnNKC2jqv9zef38PH4Ea1nb'
      }));*/

     //let res = await provider.contract().at("TWS2dqBEscxGnNKC2jqv9zef38PH4Ea1nb");

     // const owner = await res.ownerOf(1).call();

      //console.log(provider.address.fromHex(owner));

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

      notifier.on("tron:bridge_tx", async (hash: string) => {
        // console.log(hash, "tron hash");
        const evs = await txToEvent(hash);

        if (evs.length) {
          for (const ev of evs) {
            const trx = await provider.trx.getTransaction(hash);

            const owner =
              trx["raw_data"]?.contract[0]?.parameter?.value["owner_address"];

            const evData: IEventhandler = {
      
              actionId: String(ev.result["actionId"]),
              from: config.tron.nonce,
              to: String(ev.result["chainNonce"]),
              sender: provider.address.fromHex(owner),
              target: String(ev.result["txFees"]),
              hash,
              txFees: String(ev.result["txFees"]),
              tokenId: ev.name.includes("Unfreeze")
                ? String(ev.result["tokenId"])
                : String(ev.result["id"]),
              type: ev.name.includes("Unfreeze") ? "Unfreeze" : "Transfer",
              uri: ev.name.includes("Unfreeze")
                ? String(ev.result["baseURI"]).split("{")[0] +
                  String(ev.result["tokenId"])
                : String(ev.result["tokenData"]),
              contract: ev.name.includes("Unfreeze")
                ? String(ev.result["burner"])
                : String(ev.result["mintWith"]),
            };

            // console.log(evData, "evData");

            eventHandler(em.fork())(evData);
          }
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
          executedEventHandler(
            em.fork(),
            config.tron.nonce
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

/*const minter = await provider.contract(
        Minter__factory.abi,
        config.tron.contract
      );*/

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

          eventHandler(createEventRepo(em.fork()))({
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

          eventHandler(createEventRepo(em.fork()))({
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
