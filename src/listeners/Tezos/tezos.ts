import BigNumber from "bignumber.js";
import { IContractEventListener } from "../../Intrerfaces/IContractEventListener";
import config, { chainNonceToName, getTelegramTemplate } from "../../config";
import axios from "axios";
import { clientAppSocket } from "../../index";
import { ethers, BigNumber as bs } from "ethers";
import { IEvent } from "../../Intrerfaces/IEvent";
import { io } from "socket.io-client";
import createEventRepo from "../../business-logic/repo";
import { IDatabaseDriver, Connection, EntityManager, wrap } from "@mikro-orm/core";
import { executedEventHandler } from "../../handlers/index";
import { BlockRepo } from "../../Intrerfaces/IBlockRepo";
import { TezosToolkit } from "@taquito/taquito";
import { getUriFa2 } from "./getTezosData"

export function tezosEventListener(
  rpc: string,
  chainId: string,
  em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {
  // const tezos = new TezosToolkit(rpc);

  // async function getUriFa2(fa2Address: string, tokenId: string): Promise<string> {
  //   const contract = await tezos.contract.at(fa2Address);
  //   const storage = await contract.storage<{
  //     token_metadata: BigMapAbstraction;
  //   }>();

  //   const tokenStorage = await storage.token_metadata.get<{
  //     token_info: MichelsonMap<string, string>;
  //   }>(tokenId);

  //   const uriFa2 = bytes2Char(tokenStorage!.token_info.get("")!);
  //   console.log("tezos.ts Line 72 - Uri:", uriFa2)

  //   return uriFa2;
  // }

  return {
    listen: async () => {
      console.log("listen tezos ");

      setInterval(async () => {
        console.log("listen tezos2");
        try {
          const dataBCD = await axios.get(`https://api.better-call.dev/v1/contract/mainnet/KT1WKtpe58XPCqNQmPmVUq6CZkPYRms5oLvu/operations?entrypoints=freeze_fa2,withdraw_nft`)
          const lastTransactionOnContract = dataBCD.data.operations[0];
          let blocks = await em.findOne(BlockRepo, { chain: "18" });
          console.log("listen tezos3");

          if (blocks && lastTransactionOnContract.id > blocks.lastBlock) {
            console.log("listen tezos7");
            wrap(blocks).assign(
              {
                lastBlock: lastTransactionOnContract.id,
                timestamp: Math.floor(+new Date() / 1000),
              },
              { em }
            );
            await em.flush();
            const txHash = lastTransactionOnContract.hash;
            console.log("listen tezos5");

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
                    (await getUriFa2(parameter.value.fa2_address, eventObj.tokenId, rpc)))(),
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

      const executedSocket = io(config.socketUrl);

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
