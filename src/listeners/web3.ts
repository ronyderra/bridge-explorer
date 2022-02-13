import { providers } from "ethers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { IEventRepo } from "../db/repo";

export interface IContractEventListener {
  listen(): void;
}

export function contractEventService(
  provider: providers.Provider,
  minterAddress: string,
  chainName: string,
  chainNonce: string,
  erc721: string,
  eventRepo: IEventRepo
): IContractEventListener {
  return {
    listen: () => {
      const contract = Minter__factory.connect(minterAddress, provider);
      const NFTcontract = UserNftMinter__factory.connect(erc721, provider);

      const transferEvent = contract.filters.TransferErc721();
      const unfreezeEvent = contract.filters.UnfreezeNft();
      contract.on(
        transferEvent,
        async (actionId, targetNonce, txFees, to, tokenId, contract, event) => {
          const nftUri = await NFTcontract.tokenURI(tokenId);
          await eventRepo.createEvent({
            actionId: actionId.toString(),
            chainName,
            tokenId: tokenId.toString(),
            fromChain: chainNonce,
            toChain: targetNonce.toString(),
            fromHash: event.transactionHash,
            txFees: txFees.toString(),
            type: "Transfer",
            status: "Completed",
            toHash: undefined,
            senderAddress: event.address,
            targetAddress: to,
            nftUri,
          });
          console.log("Transfer", nftUri);
          console.log(
            `${chainName} ${chainNonce}  ${targetNonce} ${actionId} ${txFees} ${to} ${tokenId} ${contract}`
          );
        }
      );
      contract.on(unfreezeEvent, async (actionId, txFees, to, value, event) => {
        await eventRepo.createEvent({
          actionId: actionId.toString(),
          chainName,
          tokenId: undefined,
          fromChain: undefined,
          toChain: chainNonce,
          txFees: txFees.toString(),
          type: "Unfreeze",
          status: "Completed",
          fromHash: event.transactionHash,
          toHash: undefined,
          senderAddress: event.address,
          targetAddress: undefined,
          nftUri: value,
        });
        console.log("Unfreez", value);
        console.log(
          `${chainName} ${chainNonce} ${actionId} ${txFees} ${to} ${value}`
        );
      });
    },
  };
}
