import { IEventRepo } from "../db/repo";
import { IContractEventListener } from "./old";
import config, { chainNonceToId, chainNonceToName } from "../config";
import { io } from "socket.io-client";
import { io as clientAppSocket } from "../index";
import { IEvent,BridgeEvent } from "../entities/IEvent";
import { ethers } from "ethers";
import axios from "axios";
import { BigNumber } from "bignumber.js";
import { saveWallet } from "../db/helpers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from '@ethersproject/providers';
import IndexUpdater from "../services/indexUpdater";




const executedSocket = io(config.socketUrl);
const elrondSocket = io(config.elrond.socket);
const web3socket = io(config.web3socketUrl);

const evmNonces = config.web3.map(c => c.nonce);


export function EvmEventService(
  eventRepo: IEventRepo
): IContractEventListener {
  return {
    listen: async () => {




      web3socket.on(
        "web3:bridge_tx",
        async (
          fromChain: number,
          fromHash: string,
          actionId?: string,
          type?: "Transfer" | "Unfreeze",
          toChain?: number,
          txFees?: BigNumber,
          senderAddress?: string,
          targetAddress?: string,
          nftUri?: string,
          eventTokenId?: string,
          eventContract?: string,

        ) => {
          console.log(eventTokenId, 'eventTokenId');
          console.log(eventContract, 'eventContact');
          if (actionId && type && txFees && senderAddress) {



            const chainId = chainNonceToId(fromChain?.toString());

            let [exchangeRate, trxData]: any =
              await Promise.allSettled([
                (async () => {
                  const res = await axios(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${chainId}&vs_currencies=usd`
                  );
                  return res.data[chainId].usd;
                })(),

                (async () => {
                  if (eventTokenId && eventContract) return {

                    tokenId: eventTokenId,
                    contractAddr: eventContract

                  }
                  let res = await IndexUpdater.instance.getDepTrxData(fromHash, chainNonceToName(fromChain.toString()));


                  return res
                })()
              ]);



            const event: IEvent = {
              chainName: chainNonceToName(fromChain.toString()),
              fromChain: fromChain.toString(),
              fromChainName: chainNonceToName(fromChain.toString()),
              toChainName: chainNonceToName(toChain?.toString() || ""),
              fromHash,
              actionId: actionId,
              tokenId: trxData.status === "fulfilled" ? trxData.value.tokenId : undefined,
              type,
              status: "Pending",
              toChain: toChain?.toString(),
              txFees: txFees?.toString(),
              dollarFees:
                exchangeRate.status === "fulfilled"
                  ? new BigNumber(
                    ethers.utils.formatEther(txFees?.toString() || "")
                  )
                    .multipliedBy(exchangeRate.value)
                    .toString()
                  : "",
              senderAddress,
              targetAddress,
              nftUri,
              contract: trxData.status === "fulfilled" ? trxData.value.contractAddr : undefined
            };
            console.log(event.tokenId, 'tokenId');
            console.log(event.contract, 'contract');
            console.log(event);

            Promise.all([
              (async () => {
                return await eventRepo.createEvent(event);
              })(),
              (async () => {
                await saveWallet(
                  eventRepo,
                  event.senderAddress,
                  event.targetAddress
                );
              })(),
            ])
              .then(([doc]) => {
                console.log(doc, 'doc');
                clientAppSocket.emit("incomingEvent", doc);

                setTimeout(async () => {
                  const updated = await eventRepo.errorEvent(
                    actionId.toString(),
                    fromChain.toString()
                  );

                  if (updated) {
                    clientAppSocket.emit("updateEvent", updated);
                  }
                }, 1000 * 60);
              })
              .catch(() => { });
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
          if (!fromChain || !evmNonces.includes(fromChain.toString())) return
          console.log({
            toChain,
          fromChain,
          action_id,
          hash,
          },  "tx_executed_event");


          try {
        
            const updated = await eventRepo.updateEvent(
              action_id,
              toChain.toString(),
              fromChain.toString(),
              hash
            );
            if (!updated) return;
            console.log(updated, "updated");
            if (updated.status === "Completed") {
              IndexUpdater.instance.update(updated).catch(e => console.log(e));
            }

            clientAppSocket.emit("updateEvent", updated);
          } catch (e: any) {
            console.error(e);
          }
        }
      );

  
    },
  };
}
