import { AxiosInstance } from "axios";
import { providers } from "ethers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { chainNonceToName } from "../config";
import { IEventRepo } from "../db/repo";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { io } from "socket.io-client";
import { IEvent } from "../entities/IEvent";
import { io as clientAppSocket } from "../index";

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
              console.log('dsds')
              const updated = await eventRepo.updateEvent(
                action_id,
                fromChain.toString(),
                toChain.toString(),
                hash
              );
  
              console.log(updated,'updated');
  
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
          console.log(event);
          const NFTcontract = UserNftMinter__factory.connect(
            contract,
            provider
          );
          const nftUri = await NFTcontract.tokenURI(tokenId);
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
            senderAddress: (await event.getTransaction()).from,
            targetAddress: to,
            nftUri,
          };
         
          const doc = await eventRepo.createEvent(eventObj);
          console.log(doc);
          clientAppSocket.emit("incomingEvent", doc);
     

          console.log("Transfer", nftUri);
          console.log(
            `${chainName} ${chainNonce}  ${targetNonce} ${actionId} ${txFees} ${to} ${tokenId} ${contract}`
          );
        }
      );

      // NOTE: will work when the only when the new bridge is used

      contract.on(
        unfreezeEvent,
        async (
          actionId,
          txFees,
          to,
          value,
          burner,
          tokenId,
          baseUri,
          event
        ) => {
          
          console.log(await event.getTransaction(), 'trx');
          console.log(await event.getBlock(),'block');
          console.log(await event.getTransactionReceipt(),'receipt');
         if (event.decode)  console.log(event.decode(event.data), 'decode')
          const wrappedData = await axios
            .get<IERC721WrappedMeta>(baseUri.split("{id}")[0] + tokenId)
            .catch((e: any) => console.log("Could not fetch data"));
          //console.log(wrappedData, "wrapped");

          //const NFTcontract = UserNftMinter__factory.connect(contract,provider);

          //const nftUri = await NFTcontract.tokenURI(tokenId);

      
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
            senderAddress: (await event.getTransaction()).from,
            targetAddress: to.toString(),
            nftUri: wrappedData?.data?.wrapped?.original_uri,
            //imgUri:  wrappedData?.data?.image,
          };
      
          const doc = await eventRepo.createEvent(eventObj);
          console.log(doc);
          clientAppSocket.emit("incomingEvent", doc);
         
          console.log("unfreeze");
          console.log(
            `${chainName} ${chainNonce} ${actionId} ${txFees} ${to} ${value}`
          );
        }
      );
    },
  };
}
