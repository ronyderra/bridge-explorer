import { AxiosInstance } from "axios";
import { providers } from "ethers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { chainNonceToName } from "../config";
import { IEventRepo } from "../db/repo";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { io } from "socket.io-client";
import { IEvent } from "../entities/IEvent";
import { io as clientAppSocket } from "../index";

import { saveWallet } from "../db/helpers";

import config from "../config";

export interface IContractEventListener {
  listen(): void;
}

const socket = io(config.socketUrl);

export function EventService(eventRepo: IEventRepo): IContractEventListener {
  return {
    listen: () => {
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
            console.log(action_id, "id");
            console.log(fromChain, "from");
            const updated = await eventRepo.updateEvent(
              action_id,
              fromChain.toString(),
              toChain.toString(),
              hash
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
          const NFTcontract = UserNftMinter__factory.connect(
            contract,
            provider
          );
          const nftUri = await NFTcontract.tokenURI(tokenId);
          const senderAddress = (await event.getTransaction()).from;
          const eventObj: IEvent = {
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
            senderAddress,
            targetAddress: to,
            nftUri,
          };
          console.log(senderAddress);
          console.log(to);

          Promise.all([
            (async () => {
              return await eventRepo.createEvent(eventObj);
            })(),
            (async () => {
              await saveWallet(eventRepo, senderAddress, to);
            })(),
          ])
            .then(([doc]) => {
              console.log(doc);
              clientAppSocket.emit("incomingEvent", doc);
            })
            .catch(() => {});

          console.log("Transfer", nftUri);
          console.log("unfreeze", {
            chainName,
            actionId,
            fromChain: chainNonce,
          });
        }
      );

      // NOTE: will work when the only when the new bridge is used

      contract.on(
        unfreezeEvent,
        async (
          actionId,
          to,
          txFees,
          value,
          burner,
          tokenId,
          baseUri,
          event
        ) => {
          const wrappedData = await axios
            .get<IERC721WrappedMeta>(baseUri.split("{id}")[0] + tokenId)
            .catch((e: any) => console.log("Could not fetch data"));
          //const NFTcontract = UserNftMinter__factory.connect(contract,provider);

          //const nftUri = await NFTcontract.tokenURI(tokenId);

          const senderAddress = (await event.getTransaction()).from;
          const eventObj: IEvent = {
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
            senderAddress,
            targetAddress: value.toString(),
            nftUri: wrappedData?.data?.wrapped?.original_uri,
          };

          Promise.all([
            (async () => {
              return await eventRepo.createEvent(eventObj);
            })(),
            (async () => {
              await saveWallet(
                eventRepo,
                senderAddress,
                eventObj.targetAddress
              );
            })(),
          ])
            .then(([doc]) => {
              console.log(doc);
              clientAppSocket.emit("incomingEvent", doc);
            })
            .catch(() => {});

          console.log("unfreeze", {
            chainName,
            actionId,
            fromChain: chainNonce,
          });
        }
      );
    },
  };
}
