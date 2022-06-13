import config, { ChainConfig } from "../config";
import { io } from "socket.io-client";
import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { BigNumber } from "bignumber.js";
import { eventHandler, executedEventHandler } from "./handlers/index";
import { handleBridgeEvent, handleNativeTransferEvent, handleNativeUnfreezeEvent } from "./handlers/evm";
import { Minter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider } from "@ethersproject/providers";

interface IContractEventListener {
  listenBridge(): void;
  listenNative(chain: ChainConfig): void;
}

const executedSocket = io(config.socketUrl);
const web3socket = io(config.web3socketUrl);

export function EvmEventService(em: EntityManager<IDatabaseDriver<Connection>>): IContractEventListener {
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
          console.log("web3:bridge_tx")
          console.log(fromChain,
            fromHash,
            actionId,
            type,
            toChain,
            txFees,
            senderAddress,
            targetAddress,
            nftUri,
            eventTokenId,
            eventContract)
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

          eventData && eventHandler(em.fork())(eventData);
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
          console.log("tx_executed_event")
          console.log(fromChain,
            toChain,
            action_id,
            hash)
          if (!fromChain || !config.web3.map(c => c.nonce).includes(String(fromChain)))
            return;

          executedEventHandler(
            em.fork(),
            String(fromChain)
          )({
            fromChain,
            toChain,
            action_id,
            hash,
          });
        })
    },

    listenNative: async (chain: ChainConfig) => {
      const provider = new JsonRpcProvider(chain.node);
      const contract = Minter__factory.connect(chain.contract, provider);
      const transferEvent = contract.filters.TransferErc721();
      const unfreezeEvent = contract.filters.UnfreezeNft();
      const a = contract.filters.TransferErc1155()
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

          //eventData && (await eventHandler(eventRepo)(eventData));
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
          //eventData && (await eventHandler(eventRepo)(eventData));
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
            em.fork(),
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
