import { IContractEventListener } from "../../Intrerfaces/IContractEventListener";
import config, { getChain } from "../../config";
import { io } from "socket.io-client";
//@ts-expect-error no types, cope
import TronWeb from "tronweb";
import { departureEventHandler } from "../../EventHandler";
import { destinationEventHandler } from "../../EventHandler";
import Bottleneck from "bottleneck";
import { IEventhandler } from "../../EventHandler";
import { IDatabaseDriver, Connection, EntityManager, wrap } from "@mikro-orm/core";

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

      async function getRawEventFromTxn(
        hash: string,
        retries = 0
      ): Promise<any[] | undefined> {
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
        console.log(hash, "tron hash");
        const evs = await txToEvent(hash);
        console.log("TRON:" , evs)
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

            console.log(evData, "evData");

            departureEventHandler(em.fork())(evData);
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
          destinationEventHandler(
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
