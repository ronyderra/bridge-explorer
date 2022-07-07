import { IContractEventListener } from "../../Intrerfaces/IContractEventListener";
import config from "../../config";
import { clientAppSocket } from "../../index";
import { io } from "socket.io-client";
import createEventRepo from "../../business-logic/repo";
import { IDatabaseDriver, Connection, EntityManager, wrap } from "@mikro-orm/core";
import { destinationEventHandler } from "../../EventHandler/destination";
import { Framework } from '@vechain/connex-framework'
import { Driver, SimpleNet } from '@vechain/connex-driver'
import axios from "axios"
import { BlockRepo } from "../../Intrerfaces/IBlockRepo";
import { IEvent } from "../../Intrerfaces/IEvent";
import { EVM_VALIDATORS, getTelegramTemplate } from "../../config"
import { ethers } from "ethers";

const executedSocket = io(config.socketUrl);
const net = new SimpleNet("https://region3.xp.network/vechain/")


export function vechainListener(
    em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {

    return {
        listen: async () => {
            const driver = await Driver.connect(net)
            const connex = new Framework(driver)
            try {
                const checkForNewBlock = async () => {
                    const lastBlockOnChain = await axios.get("https://region3.xp.network/vechain/blocks/best?expanded=true")
                    let BlockNumberInDB = await em.findOne(BlockRepo, { chain: "25" });

                    if (BlockNumberInDB && BlockNumberInDB.lastBlock < lastBlockOnChain.data.number) {
                        wrap(BlockNumberInDB).assign(
                            {
                                lastBlock: lastBlockOnChain.data.number,
                                timestamp: Math.floor(+new Date() / 1000),
                            },
                            { em }
                        );
                        await em.flush();

                        const transactionsInBlock = lastBlockOnChain.data.transactions;

                        let contractTransactionHashes = [];

                        for (let i = 0; i < transactionsInBlock.length; i++) {
                            const clauses = transactionsInBlock[i].clauses
                            for (let j = 0; j < clauses.length; j++) {
                                if (clauses[j].to === "0xe860cef926e5e76e0e88fdc762417a582f849c27") {
                                    contractTransactionHashes.push(transactionsInBlock[i])
                                }
                            }
                        }

                        if (contractTransactionHashes.length > 0) {
                            for (let h = 0; h < contractTransactionHashes.length; h++) {

                                const transaction = contractTransactionHashes[h]
                                const type = EVM_VALIDATORS.includes(transaction.origin) ? "Unfreez" : "Transfer"

                                const data = transaction.clauses[0].data

                                const eventObj: IEvent = {
                                    actionId: "",
                                    chainName: "VECHAIN",
                                    tokenId: "",
                                    fromChain: "25",
                                    toChain: "",
                                    fromChainName: "VECHAIN",
                                    toChainName: "",
                                    fromHash: transaction.id,
                                    txFees: transaction.gasUsed,
                                    type,
                                    status: "Pending",
                                    toHash: undefined,
                                    senderAddress: transaction.origin,
                                    targetAddress: "",
                                    nftUri: "",
                                    collectionName: "",
                                    contract: "",
                                    createdAt: new Date()
                                };

                                console.log(eventObj)

                                const [doc] = await Promise.all([
                                    (async () => {
                                        return await createEventRepo(em.fork()).createEvent(eventObj, "Vechain");
                                    })(),
                                    // (async () => {
                                    //   return await createEventRepo(em.fork()).saveWallet(eventObj.senderAddress, eventObj.targetAddress!)
                                    // })(),
                                ])
                                if (doc) {
                                    console.log("Vechain ------TELEGRAM FUNCTION-----")
                                    console.log("doc: ", doc);

                                    setTimeout(() => clientAppSocket.emit("incomingEvent", doc), Math.random() * 3 * 1000)
                                    setTimeout(async () => {
                                        const updated = await createEventRepo(em.fork()).errorEvent(transaction.id);
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
                        }
                    }
                }

                setInterval(() => checkForNewBlock(), 7000)
            } catch (err) {
                console.log(err)
            }


            executedSocket.on("tx_executed_event", async (fromChain: number, toChain: number, action_id: string, destanationHash: string) => {
                if (!fromChain || fromChain !== 25)
                return;
                console.log({ toChain, fromChain, action_id, destanationHash, }, "VECHAIN:tx_executed_event");

                const evmNonces = config.web3.map((c) => c.nonce);

                if (evmNonces.includes(String(toChain))) {
                    console.log("Vechain line 240 - got to if")
                    destinationEventHandler(
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
                        console.log("vechain line 251 - got to else")
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
