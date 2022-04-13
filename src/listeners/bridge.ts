import { IEventRepo } from "../db/repo";
import { IContractEventListener } from "./web3";
import config, { chainNonceToId, chainNonceToName } from "../config";
import { io } from "socket.io-client";
import { io as clientAppSocket } from "../index";
import { IEvent } from "../entities/IEvent";
import { ethers } from "ethers";
import axios from "axios";
import { BigNumber } from "bignumber.js";
import { saveWallet } from "../db/helpers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from '@ethersproject/providers';
import IndexUpdater from "../services/indexUpdater";


const evmSocket = io(config.socketUrl);
const elrondSocket = io(config.elrond.socket);
const web3socket = io(config.web3socketUrl);

export  function BridgeEventService(
  eventRepo: IEventRepo
): IContractEventListener {
  return {
    listen: () => {
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
          console.log(eventContract,'eventContact');
          if (actionId && type && txFees && senderAddress) {

          
            
            const chainId = chainNonceToId(fromChain?.toString());

            let [exchangeRate, trxData]: any  =
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
                    let res = await IndexUpdater.instance.getDepTrxInfo(fromHash, chainNonceToName(fromChain.toString()));
                    

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
              tokenId:  trxData.status === "fulfilled"? trxData.value.tokenId : undefined,
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
              contract: trxData.status === "fulfilled"? trxData.value.contractAddr : undefined
            };
            console.log(event.tokenId,'tokenId');
            console.log(event.contract,'contract');
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
              .catch(() => {});
          }
        }
      );

      evmSocket.on(
        "tx_executed_event",
        async (
          toChain: number,
          fromChain: number,
          action_id: string,
          hash: string
        ) => {
          // chain is targetChain
          // action id is well, action id
          // hash is the transaction hash

          try {
            console.log(action_id, "id");
            console.log(fromChain, "toChain");
            const updated = await eventRepo.updateEvent(
              action_id,
              fromChain.toString(),
              toChain.toString(),
              hash
            );
            if (!updated) return;
            console.log(updated, "updated");
            if (updated.status === "Completed") {
               (async () => {
  
                  const nfts =  await IndexUpdater.instance.update(updated).catch(e => console.log(e))
                

                  //await IndexUpdater.instance.update(updated.toChain?.toString(), updated.targetAddress?.toString(), updated.tokenId?.toString(), updated.contract?.toString()).catch(e => console.log(e))
               })()
            }

            clientAppSocket.emit("updateEvent", updated);
          } catch (e: any) {
            console.error(e);
          }
        }
      );

      elrondSocket.on(
        "elrond:bridge_tx",
        async (
          fromHash: string,
          sender: string,
          uris: string[],
          actionId: string
        ) => {
          try {
            console.log("elrond event incoming");
            const updated = await eventRepo.updateElrond(
              actionId,
              config.elrond.nonce,
              fromHash,
              sender,
              uris[0]
            );

            console.log(updated, "updated");

            clientAppSocket.emit("updateEvent", updated);
          } catch (e: any) {
            console.error(e);
          }
        }
      );
    },
  };
}
