import { AxiosInstance } from "axios";
import { providers } from "ethers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { chainNonceToName } from "../config";
import { IEventRepo } from "../db/repo";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { io } from "socket.io-client";
import { IEvent } from "../entities/IEvent";
import { clientAppSocket } from "../index";
import { saveWallet } from "../db/helpers";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import config from "../config";

export interface IContractEventListener {
  listen(): void;
  listenBridge?: FunctionStringCallback;
}
const socket = io(config.socketUrl);

export function contractEventService(
  provider: providers.Provider,
  minterAddress: string,
  chainName: string,
  chainNonce: string,
  chainId: string,
  eventRepo: IEventRepo,
  axios: AxiosInstance
): IContractEventListener {
  return {
    listen: () => {
      const contract = Minter__factory.connect(minterAddress, provider);

      const transferEvent = contract.filters.TransferErc721();
      const unfreezeEvent = contract.filters.UnfreezeNft();
      //const a = contract.filters.

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

          let [nftUri, senderAddress, exchangeRate]:
            | PromiseSettledResult<string>[]
            | string[] = await Promise.allSettled([
            (async () => await NFTcontract.tokenURI(tokenId))(),
            (async () => {
              const res = await event.getTransaction();
              return res.from;
            })(),
            (async () => {
              const res = await axios(
                `https://api.coingecko.com/api/v3/simple/price?ids=${chainId}&vs_currencies=usd`
              );
              return res.data[chainId].usd;
            })(),
          ]);

          (nftUri = nftUri.status === "fulfilled" ? nftUri.value : ""),
            (senderAddress =
              senderAddress.status === "fulfilled" ? senderAddress.value : "");

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
            dollarFees:
              exchangeRate.status === "fulfilled"
                ? new BigNumber(ethers.utils.formatEther(txFees.toString()))
                    .multipliedBy(exchangeRate.value)
                    .toString()
                : "",
          };
          console.log(eventObj);

          Promise.all([
            (async () => {
              return await eventRepo.createEvent(eventObj);
            })(),
            (async () => {
              await saveWallet(eventRepo, eventObj.senderAddress, to);
            })(),
          ])
            .then(([doc]) => {
              clientAppSocket.emit("incomingEvent", doc);
              setTimeout(async () => {
                const updated = await eventRepo.errorEvent(
                  actionId.toString(),
                  chainNonce
                );

                if (updated) {
                  clientAppSocket.emit("updateEvent", updated);
                }
              }, 1000 * 60);
            })
            .catch(() => {});
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
          let [wrappedData, senderAddress, exchangeRate]:
            | PromiseSettledResult<string>[]
            | any[] = await Promise.allSettled([
            (async () =>
              await axios
                .get<IERC721WrappedMeta>(baseUri.split("{id}")[0] + tokenId)
                .catch((e: any) => console.log("Could not fetch data")))(),
            (async () => {
              const res = await event.getTransaction();
              return res.from;
            })(),
            (async () => {
              const res = await axios(
                `https://api.coingecko.com/api/v3/simple/price?ids=${chainId}&vs_currencies=usd`
              );
              return res.data[chainId].usd;
            })(),
          ]);

          wrappedData =
            wrappedData.status === "fulfilled" ? wrappedData.value : "";
          senderAddress =
            senderAddress.status === "fulfilled" ? senderAddress.value : "";

          console.log(senderAddress, "senderAddress");
          console.log(exchangeRate);

          const eventObj: IEvent = {
            actionId: actionId.toString(),
            chainName,
            tokenId: wrappedData?.data?.wrapped.tokenId ?? "",
            initialTokenId: tokenId.toString(),
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
            senderAddress: senderAddress,
            targetAddress: value.toString(),
            nftUri: wrappedData?.data?.wrapped?.original_uri,
            dollarFees:
              exchangeRate.status === "fulfilled"
                ? new BigNumber(ethers.utils.formatEther(txFees.toString()))
                    .multipliedBy(exchangeRate.value)
                    .toString()
                : "",
          };

          Promise.all([
            (async () => {
              return await eventRepo.createEvent(eventObj);
            })(),
            (async () => {
              await saveWallet(
                eventRepo,
                eventObj.senderAddress,
                eventObj.targetAddress
              );
            })(),
          ])
            .then(([doc]) => {
              console.log(doc);
              clientAppSocket.emit("incomingEvent", doc);
              setTimeout(async () => {
                const updated = await eventRepo.errorEvent(
                  actionId.toString(),
                  chainNonce
                );

                if (updated) {
                  clientAppSocket.emit("updateEvent", updated);
                }
              }, 1000 * 60);
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
