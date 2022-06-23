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
import { IDatabaseDriver, Connection, EntityManager, wrap } from "@mikro-orm/core";
import { executedEventHandler } from "../../handlers/index";
import { getTezosCollectionData } from "./getTezosData"
import { BlockRepo } from "../../Intrerfaces/IBlockRepo";
import {
  MichelsonV1Expression,
  MichelsonV1ExpressionBase,
  MichelsonV1ExpressionExtended,
  OperationContentsAndResult,
  OperationContentsAndResultTransaction,
  OperationResultTransaction,
  OpKind,
} from "@taquito/rpc";
import {
  BigMapAbstraction,
  MichelCodecPacker,
  MichelsonMap,
  OperationContent,
  TezosToolkit,
} from "@taquito/taquito";

const util = require("util");

const executedSocket = io(config.socketUrl);

function isTransactionResult(
  data: OperationContent | OperationContentsAndResult
): data is OperationContentsAndResultTransaction {
  return data.kind == OpKind.TRANSACTION;
}

function getActionId(opRes: OperationResultTransaction): BigNumber {
  const storage = opRes.storage! as MichelsonV1Expression[];
  const pair = storage[0] as MichelsonV1ExpressionExtended[];
  const val = pair[0].args![0] as MichelsonV1ExpressionBase;
  return new BigNumber(val.int!);
}
const web3socket = io(config.web3socketUrl);

export function tezosEventListener(
  rpc: string,
  contract: string,
  chainName: string,
  chainNonce: string,
  chainId: string,
  em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {
  const tezos = new TezosToolkit(rpc);

  const sub = tezos.stream.subscribeOperation({ destination: contract });

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
      console.log("listen tezos");

      setInterval(async () => {
        try {
          const dataBCD = await axios.get(`https://api.better-call.dev/v1/contract/mainnet/KT1WKtpe58XPCqNQmPmVUq6CZkPYRms5oLvu/operations?entrypoints=freeze_fa2,withdraw_nft`)
          const lastTransactionOnContract = dataBCD.data.operations[0];
          let blocks = await em.findOne(BlockRepo, { chain: "18" });

          if (blocks && lastTransactionOnContract.id > 1) {
            wrap(blocks).assign(
              {
                lastBlock: lastTransactionOnContract.id,
                timestamp: Math.floor(+new Date() / 1000),
              },
              { em }
            );
            await em.flush();
            const txHash = lastTransactionOnContract.hash;

            console.log("TEZOS.ts line 93 -web3:bridge_tx", txHash)

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
                return await createEventRepo(em.fork()).createEvent(eventObj);
              })(),
              (async () => {
                return await createEventRepo(em.fork()).saveWallet(eventObj.senderAddress, eventObj.targetAddress!)
              })(),
            ])
            if (doc) {
              console.log("------TELEGRAM FUNCTION-----")
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
          }
        } catch (err) {
          console.log(err)
        }
      }, 10000)


      // sub.on("data", async (data: | OperationContent | (OperationContentsAndResult & { hash: string })) => {
      //   console.log("Tezos Got Data Line 78:", data)
      //   if (
      //     !isTransactionResult(data) ||
      //     !data.parameters ||
      //     data.metadata.operation_result.status != "applied" ||
      //     data.destination != contract
      //   ) {
      //     return;
      //   }

      //   switch (data.parameters.entrypoint) {
      //     case "freeze_fa2": {
      //       const params = data.parameters.value as MichelsonV1ExpressionExtended;
      //       const fullParmams = params.args as MichelsonV1ExpressionExtended[];
      //       const param1 = fullParmams[0] as MichelsonV1ExpressionExtended;
      //       const param2 = fullParmams[1] as MichelsonV1ExpressionExtended;
      //       const tchainNonce = param1.args![0] as MichelsonV1ExpressionBase;
      //       const fa2Address = param1.args![1] as MichelsonV1ExpressionBase;
      //       const to = param2.args![0] as MichelsonV1ExpressionBase;
      //       const tokenId = param2.args![1] as MichelsonV1ExpressionBase;
      //       const actionId = getActionId(data.metadata.operation_result);

      //       const collectionData = await getTezosCollectionData(data.hash)
      //       console.log("collectionData", collectionData)

      //       const eventObj: IEvent = {
      //         actionId: actionId.toString(),
      //         chainName,
      //         //@ts-ignore
      //         tokenId: collectionData?.tokenId,
      //         fromChain: chainNonce,
      //         toChain: tchainNonce.int,
      //         fromChainName: chainNonceToName(chainNonce),
      //         toChainName: chainNonceToName(tchainNonce.int!),
      //         fromHash: data.hash,
      //         txFees: new BigNumber(data.amount)
      //           .multipliedBy(1e12)
      //           .toString(),
      //         type: "Transfer",
      //         status: "Pending",
      //         toHash: undefined,
      //         senderAddress: data.source,
      //         targetAddress: to.string,
      //         nftUri: "",
      //         contract: collectionData?.contractAdd,
      //         collectionName: collectionData?.collectionName,
      //         createdAt: new Date()
      //       };

      //       try {
      //         let [url, exchangeRate]:
      //           | PromiseSettledResult<string>[]
      //           | string[] = await Promise.allSettled([
      //             (async () =>
      //               fa2Address?.string &&
      //               eventObj.tokenId &&
      //               (await getUriFa2(fa2Address.string, eventObj.tokenId)))(),
      //             (async () => {
      //               const res = await axios(
      //                 `https://api.coingecko.com/api/v3/simple/price?ids=${chainId}&vs_currencies=usd`
      //               );
      //               return res.data[chainId].usd;
      //             })(),
      //           ]);
      //         eventObj.nftUri = url.status === "fulfilled" ? url.value : "";
      //         eventObj.dollarFees =
      //           exchangeRate.status === "fulfilled"
      //             ? new BigNumber(ethers.utils.formatEther(eventObj.txFees))
      //               .multipliedBy(exchangeRate.value)
      //               .toString()
      //             : "";
      //       } catch (e) {
      //         console.log(e);
      //       }
      //       console.log("hree-----------")
      //       console.log(eventObj);
      //       Promise.all([
      //         (async () => {
      //           return await createEventRepo(em.fork()).createEvent(eventObj);
      //         })(),
      //         (async () => await createEventRepo(em.fork()).saveWallet(eventObj.senderAddress, eventObj.targetAddress!))(),
      //       ]).then(([doc]) => {
      //         console.log("DOC!!!!!!!!!!!!!!!!!!!!!!!")
      //         console.log(doc)
      //         clientAppSocket.emit("incomingEvent", doc);
      //       });
      //       break;
      //     }

      //     case "withdraw_nft": {
      //       console.log(util.inspect(data, false, null, true /* enable colors */));
      //       const params = data.parameters.value as MichelsonV1ExpressionExtended;
      //       const to = params.args![0] as MichelsonV1ExpressionBase;
      //       //@ts-ignore
      //       const tokenId = params?.args[1]?.args[1]?.int; //data?.metadata?.operation_result?.storage[0][3]?.int;
      //       const actionId = getActionId(data.metadata.operation_result);
      //       //@ts-ignore
      //       const tchainNonce = to.args[1].int; // TODO
      //       const burner = ""; // TODO

      //       const eventObj: IEvent = {
      //         actionId: actionId.toString(),
      //         chainName,
      //         tokenId,
      //         fromChain: chainNonce,
      //         toChain: tchainNonce,
      //         fromChainName: chainNonceToName(chainNonce),
      //         toChainName: chainNonceToName(tchainNonce),
      //         fromHash: data.hash,
      //         txFees: new BigNumber(data.amount)
      //           .multipliedBy(1e12)
      //           .toString(),
      //         //dollarFees:
      //         type: "Unfreeze",
      //         status: "Pending",
      //         toHash: undefined,
      //         senderAddress: data.source,
      //         //@ts-ignore
      //         targetAddress: params?.args[1]?.args[0]?.string,
      //         nftUri: "",
      //         createdAt: new Date()
      //       };

      //       try {
      //         let [url, exchangeRate]:
      //           | PromiseSettledResult<string>[]
      //           | string[] = await Promise.allSettled([
      //             (async () => await getUriFa2(config.tezos.xpnft, tokenId.int!))(),
      //             (async () => {
      //               const res = await axios(
      //                 `https://api.coingecko.com/api/v3/simple/price?ids=${chainId}&vs_currencies=usd`
      //               );
      //               return res.data[chainId].usd;
      //             })(),
      //           ]);
      //         eventObj.nftUri = url.status === "fulfilled" ? url.value : "";
      //         eventObj.dollarFees =
      //           exchangeRate.status === "fulfilled"
      //             ? new BigNumber(ethers.utils.formatEther(eventObj.txFees))
      //               .multipliedBy(exchangeRate.value)
      //               .toString()
      //             : "";
      //       } catch (e) {
      //         console.log(e);
      //       }

      //       Promise.all([
      //         (async () => {
      //           return await createEventRepo(em.fork()).createEvent(eventObj);
      //         })(),
      //         (async () => await createEventRepo(em.fork()).saveWallet(eventObj.senderAddress, eventObj.targetAddress!))(),
      //       ]).then(([doc]) => {
      //         console.log("this DOC!!!!!!!!!!!!!!!!!!!!!!!")
      //         console.log(doc)
      //         clientAppSocket.emit("incomingEvent", doc);
      //       });
      //       break;
      //     }
      //   }
      // }
      // );

      //executes if from chain is tezos , listens to destenation transaction , and if to chain is evm then goes to execute handler




      executedSocket.on("tx_executed_event", async (fromChain: number, toChain: number, action_id: string, destanationHash: string) => {
        if (!fromChain || fromChain.toString() !== config.tezos.nonce) return;
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
