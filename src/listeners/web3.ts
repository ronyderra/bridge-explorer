import { AxiosInstance } from "axios";
import { providers } from "ethers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { chainNonceToName } from "../config";
import { IEventRepo } from "../db/repo";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { io } from "socket.io-client";
import config from "../config";

export interface IContractEventListener {
  listen(): void;
}

const socket = io(config.socketUrl);

export function contractEventService(
  provider: providers.Provider,
  minterAddress: string,
  chainName: string,
  chainNonce: string,
  eventRepo: IEventRepo,
  axios: AxiosInstance
): IContractEventListener {
  return {
    listen: () => {
      const contract = Minter__factory.connect(minterAddress, provider);

      const transferEvent = contract.filters.TransferErc721();
      const unfreezeEvent = contract.filters.UnfreezeNft();
      contract.on(
        transferEvent,
        async (actionId, targetNonce, txFees, to, tokenId, contract, event) => {
          const NFTcontract = UserNftMinter__factory.connect(
            contract,
            provider
          );
          const nftUri = await NFTcontract.tokenURI(tokenId);
          await eventRepo.createEvent({
            actionId: actionId.toString(),
            chainName,
            tokenId: tokenId.toString(),
            fromChain: chainNonce,
            toChain: targetNonce.toString(),
            fromChainName: chainNonceToName(chainNonce),
            toChainName: chainNonceToName(targetNonce.toString()),
            fromHash: event.transactionHash,
            txFees: txFees.toString(),
            type: "Transfer",
            status: "Pending",
            toHash: undefined,
            senderAddress: (await event.getTransaction()).from,
            targetAddress: to,
            nftUri,
          });
          console.log("Transfer", nftUri);
          console.log(
            `${chainName} ${chainNonce}  ${targetNonce} ${actionId} ${txFees} ${to} ${tokenId} ${contract}`
          );
        }
      );
      // TODO: fix
      socket.on(
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
            await eventRepo.updateEvent(
              action_id,
              fromChain.toString(),
              toChain.toString(),
              hash
            );
          } catch (e: any) {
            console.error(e);
          }
        }
      );
      contract.on(unfreezeEvent, async (actionId, txFees, to, value, event) => {
        const wrappedData = await axios
          .get<IERC721WrappedMeta>(value)
          .catch((e: any) => console.log("Could not fetch data"));
        await eventRepo.createEvent({
          actionId: actionId.toString(),
          chainName,
          tokenId: wrappedData?.data?.wrapped.tokenId,
          fromChain: chainNonce,
          toChain: wrappedData?.data?.wrapped?.origin ?? "N/A",
          fromChainName: chainNonceToName(chainNonce),
          toChainName: chainNonceToName(
            wrappedData?.data?.wrapped?.origin ?? "N/A"
          ),
          txFees: txFees.toString(),
          type: "Unfreeze",
          status: "Pending",
          fromHash: event.transactionHash,
          toHash: undefined,
          senderAddress: (await event.getTransaction()).from,
          targetAddress: to,
          nftUri: value,
        });
        console.log(
          `${chainName} ${chainNonce} ${actionId} ${txFees} ${to} ${value}`
        );
      });
    },
  };
}
