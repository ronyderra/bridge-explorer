import { providers } from "ethers";
import { Minter__factory } from "xpnet-web3-contracts";
import { PrismaClient } from "@prisma/client";
import { IEventRepo } from "../db/repo";

const prisma = new PrismaClient();

export interface IContractEventListener {
  listen(): void;
}

export function contractEventService(
  provider: providers.Provider,
  address: string,
  chainName: string,
  chainNonce: string,
  eventRepo: IEventRepo
): IContractEventListener {
  return {
    listen: () => {
      const contract = Minter__factory.connect(address, provider);
      const transferEvent = contract.filters.TransferErc721();
      const unfreezeEvent = contract.filters.UnfreezeNft();
      contract.on(
        transferEvent,
        async (actionId, targetNonce, txFees, to, id, contract) => {
          await eventRepo.createEvent({
            actionId: actionId.toString(),
            chainName,
            eventId: id.toString(),
            fromChain: chainNonce,
            toChain: targetNonce.toString(),
            txFees: txFees.toString(),
            type: "Transfer",
          });
          console.log(
            `${chainName} ${chainNonce}  ${targetNonce} ${actionId} ${txFees} ${to} ${id} ${contract}`
          );
        }
      );
      contract.on(unfreezeEvent, async (actionId, txFees, to, value) => {
        await eventRepo.createEvent({
          actionId: actionId.toString(),
          chainName,
          eventId: undefined,
          fromChain: undefined,
          toChain: chainNonce,
          txFees: txFees.toString(),
          type: "Transfer",
        });
        console.log(
          `${chainName} ${chainNonce} ${actionId} ${txFees} ${to} ${value}`
        );
      });
    },
  };
}
