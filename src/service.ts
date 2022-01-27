import { providers } from "ethers";
import { Minter__factory } from "xpnet-web3-contracts";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export interface IContractEventListener {
  listen(): void;
}

export function contractTransferEventService(
  provider: providers.Provider,
  address: string,
  chainName: string,
  chainNonce: string
): IContractEventListener {
  return {
    listen: () => {
      const contract = Minter__factory.connect(address, provider);
      const eventfiter = contract.filters.TransferErc721();
      contract.on(
        eventfiter,
        async (actionId, targetNonce, txFees, to, id, contract) => {
          await prisma.event.create({
            data: {
              chainName,
              type: "TransferErc721",
              fromChain: chainNonce,
              toChain: targetNonce.toString(),
              actionId: actionId.toString(),
              txFees: txFees.toString(),
            },
          });
          console.log(
            `${chainName} ${chainNonce}  ${targetNonce} ${actionId} ${txFees} ${to} ${id} ${contract}`
          );
        }
      );
    },
  };
}

export function contractUnfreezeEventService(
  provider: providers.Provider,
  address: string,
  chainName: string,
  chainNonce: string
): IContractEventListener {
  return {
    listen: () => {
      const contract = Minter__factory.connect(address, provider);
      const eventfiter = contract.filters.UnfreezeNft();
      contract.on(eventfiter, async (actionId, txFees, to, value) => {
        await prisma.event.create({
          data: {
            chainName,
            type: "UnfreezeNft",
            fromChain: chainNonce,
            actionId: actionId.toString(),
            txFees: txFees.toString(),
          },
        });
        console.log(
          `${chainName} ${chainNonce} ${actionId} ${txFees} ${to} ${value}`
        );
      });
    },
  };
}

type EventType = "Transfer" | "Freeze";
export interface Entry {
  fromChain: number;
  toChain: number;
  actionId: bigint;
  to: string;
  data: string;
  txFees: string;
  id: number;
  tokenAddress: string;
  type: EventType;
}
