import BigNumber from "bignumber.js";
import { IContractEventListener } from "./old";
import { bytes2Char, char2Bytes } from "@taquito/utils";
import { saveWallet } from "../db/helpers";
import { IEventRepo } from "../db/repo";
import config, { chainNonceToName } from "../config";
import axios from "axios";
import { clientAppSocket } from "../index";
import { ethers, BigNumber as bs } from "ethers";
import { IEvent } from "../entities/IEvent";
import { io } from "socket.io-client";

const util = require("util");

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

export function tezosEventListener(
  rpc: string,
  contract: string,
  chainName: string,
  chainNonce: string,
  chainId: string,
  eventRepo: IEventRepo
): IContractEventListener {
  const tezos = new TezosToolkit(rpc);
  const sub = tezos.stream.subscribeOperation({
    destination: contract,
  });

  async function getUriFa2(
    fa2Address: string,
    tokenId: string
  ): Promise<string> {
    const contract = await tezos.contract.at(fa2Address);
    const storage = await contract.storage<{
      token_metadata: BigMapAbstraction;
    }>();

    const tokenStorage = await storage.token_metadata.get<{
      token_info: MichelsonMap<string, string>;
    }>(tokenId);

    return bytes2Char(tokenStorage!.token_info.get("")!);
  }

  return {
    listen: async () => {
      console.log("listen tezos");

      //const a = await getUriFa2('KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton', '517745');
      //console.log(a);

      sub.on(
        "data",
        async (
          data:
            | OperationContent
            | (OperationContentsAndResult & { hash: string })
        ) => {
          if (
            !isTransactionResult(data) ||
            !data.parameters ||
            data.metadata.operation_result.status != "applied" ||
            data.destination != contract
          ) {
            return;
          }

          switch (data.parameters.entrypoint) {
            case "freeze_fa2": {
              const params = data.parameters
                .value as MichelsonV1ExpressionExtended;
              const fullParmams = params.args as MichelsonV1ExpressionExtended[];
              const param1 = fullParmams[0] as MichelsonV1ExpressionExtended;
              const param2 = fullParmams[1] as MichelsonV1ExpressionExtended;

              const tchainNonce = param1.args![0] as MichelsonV1ExpressionBase;
              const fa2Address = param1.args![1] as MichelsonV1ExpressionBase;
              console.log(fa2Address);
              const to = param2.args![0] as MichelsonV1ExpressionBase;
              const tokenId = param2.args![1] as MichelsonV1ExpressionBase;
              const actionId = getActionId(data.metadata.operation_result);
              //@ts-ignore
              console.log(tokenId?.args[1].int!);
              console.log(tchainNonce);

              const eventObj: IEvent = {
                actionId: actionId.toString(),
                chainName,
                //@ts-ignore
                tokenId: tokenId.args[1].int.toString(),
                fromChain: chainNonce,
                toChain: tchainNonce.int,
                fromChainName: chainNonceToName(chainNonce),
                toChainName: chainNonceToName(tchainNonce.int!),
                fromHash: data.hash,
                txFees: new BigNumber(data.amount)
                  .multipliedBy(1e12)
                  .toString(),
                type: "Transfer",
                status: "Pending",
                toHash: undefined,
                senderAddress: data.source,
                targetAddress: to.string,
                nftUri: "",
              };

              try {
                let [url, exchangeRate]:
                  | PromiseSettledResult<string>[]
                  | string[] = await Promise.allSettled([
                  (async () =>
                    fa2Address?.string &&
                    eventObj.tokenId &&
                    (await getUriFa2(fa2Address.string, eventObj.tokenId)))(),
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
              console.log(eventObj);
              Promise.all([
                (async () => {
                  return await eventRepo.createEvent(eventObj);
                })(),
                (async () => {
                  await saveWallet(
                    eventRepo,
                    eventObj.senderAddress,
                    eventObj.targetAddress
                  );
                })(),
              ]).then(([doc]) => {
                console.log("end");
                clientAppSocket.emit("incomingEvent", doc);
              });
              break;
            }

            case "withdraw_nft": {
              console.log(
                util.inspect(data, false, null, true /* enable colors */)
              );
              const params = data.parameters
                .value as MichelsonV1ExpressionExtended;
              const to = params.args![0] as MichelsonV1ExpressionBase;
              //@ts-ignore
              const tokenId = params?.args[1]?.args[1]?.int; //data?.metadata?.operation_result?.storage[0][3]?.int;
              const actionId = getActionId(data.metadata.operation_result);
              //@ts-ignore
              const tchainNonce = to.args[1].int; // TODO
              const burner = ""; // TODO

              const eventObj: IEvent = {
                actionId: actionId.toString(),
                chainName,
                tokenId,
                fromChain: chainNonce,
                toChain: tchainNonce,
                fromChainName: chainNonceToName(chainNonce),
                toChainName: chainNonceToName(tchainNonce),
                fromHash: data.hash,
                txFees: new BigNumber(data.amount)
                  .multipliedBy(1e12)
                  .toString(),
                //dollarFees:
                type: "Unfreeze",
                status: "Pending",
                toHash: undefined,
                senderAddress: data.source,
                //@ts-ignore
                targetAddress: params?.args[1]?.args[0]?.string,
                nftUri: "",
              };

              try {
                let [url, exchangeRate]:
                  | PromiseSettledResult<string>[]
                  | string[] = await Promise.allSettled([
                  (async () =>
                    await getUriFa2(config.tezos.xpnft, tokenId.int!))(),
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

              Promise.all([
                (async () => {
                  return await eventRepo.createEvent(eventObj);
                })(),
                (async () => {
                  await saveWallet(
                    eventRepo,
                    eventObj.senderAddress,
                    eventObj.targetAddress
                  );
                })(),
              ]).then(([doc]) => {
                clientAppSocket.emit("incomingEvent", doc);
              });

              break;
            }
          }
        }
      );

      executedSocket.on(
        "tx_executed_event",
        async (
          fromChain: number,
          toChain: number,
          action_id: string,
          hash: string
        ) => {
          if (!fromChain || fromChain.toString() !== config.tezos.nonce) return;
          console.log(
            {
              toChain,
              fromChain,
              action_id,
              hash,
            },
            "tezos:tx_executed_event"
          );

          try {
            const updated = await eventRepo.updateEvent(
              action_id,
              toChain.toString(),
              fromChain.toString(),
              hash
            );
            if (!updated) return;
            console.log(updated, "updated");

            if (updated.toChain === config.algorand.nonce) {
              if (updated.toHash?.split("-").length! > 2) {
                clientAppSocket.emit("updateEvent", updated);
              }
              return;
            }

            clientAppSocket.emit("updateEvent", updated);
          } catch (e) {
            console.error(e);
          }
        }
      );
    },
  };
}
