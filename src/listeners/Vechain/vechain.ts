import { IContractEventListener } from "../../Intrerfaces/IContractEventListener";
import config from "../../config";
import { clientAppSocket } from "../../index";
import { io } from "socket.io-client";
import createEventRepo from "../../business-logic/repo";
import { IDatabaseDriver, Connection, EntityManager, wrap } from "@mikro-orm/core";
import { executedEventHandler } from "../../handlers/index";
import { Framework } from '@vechain/connex-framework'
import { Driver, SimpleNet } from '@vechain/connex-driver'

const executedSocket = io(config.socketUrl);

const net = new SimpleNet("https://sync-mainnet.veblocks.net")


export function vechainListener(
    em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {

    return {
        listen: async () => {
            const driver = await Driver.connect(net)
            const connex = new Framework(driver)
            console.log("listen vechain ");
            console.log("res :" ,  connex.thor.genesis)


            executedSocket.on("tx_executed_event", async (fromChain: number, toChain: number, action_id: string, destanationHash: string) => {
                if (!fromChain || fromChain.toString() !== config.vechain.nonce) return;
                console.log({ toChain, fromChain, action_id, destanationHash, }, "tezos:tx_executed_event");

                const evmNonces = config.web3.map((c) => c.nonce);

                if (evmNonces.includes(String(toChain))) {
                    console.log("tezos line 240 - got to if")
                    executedEventHandler(
                        em.fork(),
                        String(fromChain)
                    )({
                        fromChain,
                        toChain,
                        action_id,
                        hash: destanationHash,
                    });
                } else {
                    try {
                        console.log("tezos line 251 - got to else")
                        const updated = await createEventRepo(em.fork()).updateEvent(
                            action_id,
                            toChain.toString(),
                            fromChain.toString(),
                            destanationHash
                        );
                        if (!updated) return;
                        console.log(updated, "updated");

                        if (updated.toChain === config.algorand.nonce) {
                            if (updated.toHash?.split("-").length! >= 2) {
                                clientAppSocket.emit("updateEvent", updated);
                            }
                            return;
                        }

                        clientAppSocket.emit("updateEvent", updated);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
            );
        },
    };
}
