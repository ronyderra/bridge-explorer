import { IEventRepo } from "../db/repo";
import { IContractEventListener } from "./web3";
import config, { chainNonceToId, chainNonceToName, getChain } from "../config";
import { io } from "socket.io-client";
import { io as clientAppSocket } from "../index";
import { IEvent } from "../entities/IEvent";
import { ethers } from "ethers";
import axios from "axios";
import { BigNumber } from "bignumber.js";
import { saveWallet } from "../db/helpers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
import IndexUpdater from "../services/indexUpdater";
import { handleBridgeEvent } from "./helpers/evm";
import { eventHandler } from "./helpers/index";

const evmSocket = io(config.socketUrl);
const elrondSocket = io(config.elrond.socket);
const web3socket = io(config.web3socketUrl);

export function BridgeEventService(
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
          eventContract?: string
        ) => {
          const eventData = await handleBridgeEvent({
            fromChain,
            fromHash,
            actionId,
            type,
            toChain,
            txFees,
            senderAddress,
            targetAddress,
            nftUri,
            eventTokenId,
            eventContract,
          });

          eventData && (await eventHandler(eventRepo)(eventData))
        }
      );

      evmSocket.on(
        "tx_executed_event",
        async (fromChain: number, action_id: string, hash: string) => {
          // chain is targetChain
          // action id is well, action id
          // hash is the transaction hash
          const id =
            Number(action_id) -
            (getChain(fromChain.toString())?.actionIdOffset || 0);
          try {
            console.log(action_id, "id");
            console.log(fromChain, "fromChain");
            console.log(hash, "hash");

            const updated = await eventRepo.updateEvent(
              fromChain.toString(),
              id.toString(),
              hash
            );
            if (!updated) return;
            console.log(updated, "updated");
            if (updated.status === "Completed") {
              //IndexUpdater.instance.update(updated).catch(e => console.log(e));
            }

            clientAppSocket.emit("updateEvent", updated);
          } catch (e) {
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
          } catch (e) {
            console.error(e);
          }
        }
      );
    },
  };
}
