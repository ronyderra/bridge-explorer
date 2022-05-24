import { IEventRepo } from "../db/repo";
import config, { ChainConfig } from "../config";
import { io } from "socket.io-client";
import { clientAppSocket } from "../index";

import { BigNumber } from "bignumber.js";
import IndexUpdater from "../services/indexUpdater";
import { eventHandler, executedEventHandler } from "./helpers/index";
import {
  handleBridgeEvent,
  handleNativeTransferEvent,
  handleNativeUnfreezeEvent,
} from "./helpers/evm";
import { Minter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";

interface IContractEventListener {
  //listen(): void;
  listenBridge(): void;
  listenNative(chain: ChainConfig): void;
}

const executedSocket = io(config.socketUrl);
const web3socket = io(config.web3socketUrl);

export function EvmEventService(eventRepo: IEventRepo): IContractEventListener {
  return {
    listenBridge: async () => {
      console.log("listen --NOTIFIER--");
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

          eventData && (await eventHandler(eventRepo)(eventData));
        }
      );
    },
    listenNative: async (chain: ChainConfig) => {
      const provider = new JsonRpcProvider(chain.node);
      const contract = Minter__factory.connect(chain.contract, provider);

      const transferEvent = contract.filters.TransferErc721();
      const unfreezeEvent = contract.filters.UnfreezeNft();
      console.log(`listen ${chain.name}`);
      contract.on(
        transferEvent,
        async (
          actionId,
          targetNonce,
          txFees,
          to,
          tokenId,
          contract,
          tokenData,
          mintWith,
          event
        ) => {
          console.log({
            actionId,
            targetNonce,
            txFees,
            to,
            tokenId,
            contract,
            tokenData,
            mintWith,
          });

          const eventData = await handleNativeTransferEvent(
            chain.nonce,
            provider
          )({
            actionId,
            targetNonce,
            txFees,
            to,
            tokenId,
            contract,
            tokenData,
            mintWith,
            event,
          });

          eventData && (await eventHandler(eventRepo)(eventData));
        }
      );

      contract.on(
        unfreezeEvent,
        async (
          actionId,
          _,
          txFees,
          target,
          burner,
          tokenId,
          baseUri,
          event
        ) => {
          const eventData = await handleNativeUnfreezeEvent(
            chain.nonce,
            provider
          )({
            actionId,
            _,
            txFees,
            target,
            burner,
            tokenId,
            baseUri,
            event,
          });

          eventData && (await eventHandler(eventRepo)(eventData));
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
          executedEventHandler(
            eventRepo,
            chain.nonce
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
