import BigNumber from "bignumber.js";
import { IContractEventListener } from "../../Intrerfaces/IContractEventListener";
import { bytes2Char } from "@taquito/utils";
import config, { chainNonceToName, getTelegramTemplate } from "../../config";
import axios from "axios";
import { clientAppSocket } from "../../index";
import { ethers, BigNumber as bs } from "ethers";
import { IEvent } from "../../Intrerfaces/IEvent";
import { io } from "socket.io-client";
import createEventRepo from "../../business-logic/repo";
import { IDatabaseDriver, Connection, EntityManager } from "@mikro-orm/core";
import { BigMapAbstraction, MichelsonMap, TezosToolkit } from "@taquito/taquito";

const web3socket = io(config.web3socketUrl);

export function tezosEventListener3(
    rpc: string,
    chainId: string,
    em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {
    const tezos = new TezosToolkit(rpc);

    async function getUriFa2(fa2Address: string, tokenId: string): Promise<string> {
        const contract = await tezos.contract.at(fa2Address);
        const storage = await contract.storage<{
            token_metadata: BigMapAbstraction;
        }>();

        const tokenStorage = await storage.token_metadata.get<{
            token_info: MichelsonMap<string, string>;
        }>(tokenId);

        const uriFa2 = bytes2Char(tokenStorage!.token_info.get("")!);
        console.log("tezos.ts Line 72 - Uri:", uriFa2)

        return uriFa2;
    }

    return {
        listen: async () => {
            console.log("listen tezos 3");

            web3socket.on("tezos3:bridge_tx", async (txHash: string) => {
                try {
                    console.log("TEZOS3.ts line 93 -web3:bridge_tx", txHash)

                    const data = await axios.get(`https://api.tzkt.io/v1/operations/${txHash}`)
                    const parameter = data.data[0]?.parameter;
                    const storage = data.data[0]?.storage;
                    const target = data.data[0]?.target
                    const entrypoint = parameter?.entrypoint;

                    const eventObj: IEvent = {
                        actionId: "",
                        chainName: "TEZOS",
                        tokenId: "",
                        fromChain: "18",
                        toChain: "",
                        fromChainName: "TEZOS",
                        toChainName: "",
                        fromHash: txHash,
                        txFees: "",
                        type: "",
                        status: "Pending",
                        toHash: undefined,
                        senderAddress: "",
                        targetAddress: "",
                        nftUri: "",
                        collectionName: "",
                        contract: "",
                        createdAt: new Date()
                    };

                    switch (entrypoint) {
                        case "freeze_fa2": {
                            eventObj.actionId = storage.action_cnt;
                            eventObj.tokenId = parameter.value.token_id;
                            eventObj.toChain = parameter.value.chain_nonce;
                            eventObj.txFees = new BigNumber(data.data[0].amount).multipliedBy(1e12).toString();
                            eventObj.type = "Transfer";
                            eventObj.senderAddress = data.data[0].sender.address;
                            eventObj.targetAddress = parameter.value?.to;
                            eventObj.contract = parameter?.value.fa2_address;
                            eventObj.collectionName = data.data[1]?.target?.alias;
                            eventObj.toChainName = chainNonceToName(parameter.value.chain_nonce.toString());
                            break;
                        }
                        case "withdraw_nft": {
                            eventObj.actionId = storage.action_cnt;
                            eventObj.tokenId = parameter.value.token_id;
                            eventObj.txFees = new BigNumber(data.data[0].amount).multipliedBy(1e12).toString();
                            eventObj.type = "Unfreez";
                            eventObj.senderAddress = data.data[0].sender?.address;
                            eventObj.targetAddress = parameter.value.to;
                            eventObj.contract = target.address;
                            eventObj.collectionName = data.data[1].target.alias;
                            eventObj.toChainName = chainNonceToName(parameter.value.chain_nonce.toString());
                            break;
                        }
                    }

                    try {
                        let [url, exchangeRate]:
                            | PromiseSettledResult<string>[]
                            | string[] = await Promise.allSettled([
                                (async () =>
                                    parameter.value.fa2_address &&
                                    eventObj.tokenId &&
                                    (await getUriFa2(parameter.value.fa2_address, eventObj.tokenId)))(),
                                (async () => {
                                    const res = await axios(
                                        `https://api.coingecko.com/api/v3/simple/price?ids=${chainId}&vs_currencies=usd`
                                    );
                                    return res.data[chainId].usd;
                                })(),
                            ]);

                        eventObj.nftUri = url.status === "fulfilled" ? url.value : "";
                        eventObj.dollarFees =
                            exchangeRate.status === "fulfilled"
                                ? new BigNumber(ethers.utils.formatEther(eventObj.txFees))
                                    .multipliedBy(exchangeRate.value)
                                    .toString()
                                : "";
                    } catch (e) {
                        console.log(e);
                    }

                    const [doc] = await Promise.all([
                        (async () => {
                            return await createEventRepo(em.fork()).createEvent(eventObj , "tezosListener3");
                        })(),
                        (async () => {
                            return await createEventRepo(em.fork()).saveWallet(eventObj.senderAddress, eventObj.targetAddress!)
                        })(),
                    ])
                    if (doc) {
                        console.log("TezosListener3 ------TELEGRAM FUNCTION-----")
                        console.log("doc: ", doc);

                        setTimeout(() => clientAppSocket.emit("incomingEvent", doc), Math.random() * 3 * 1000)
                        setTimeout(async () => {
                            const updated = await createEventRepo(em.fork()).errorEvent(txHash);
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

                } catch (err) {
                    console.log(err)
                }
            });
        },
    };
}