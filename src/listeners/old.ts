import { AxiosInstance } from "axios";
import { providers } from "ethers";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { chainNonceToName } from "../config";
import { IEventRepo } from "../db/repo";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { io } from "socket.io-client";
import { IEvent } from "../entities/IEvent";
import { io as clientAppSocket } from "../index";
//import PromiseFulfilledResult from 'express'
import { saveWallet } from "../db/helpers";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import config from "../config";

export interface IContractEventListener {
  listen(): void;
  listenBridge? : FunctionStringCallback
}

const TestNetRpcUri: any = {
  ELROND: "https://devnet-api.elrond.com",
  HECO: "https://http-testnet.hecochain.com",
  BSC: "https://speedy-nodes-nyc.moralis.io/3749d19c2c6dbb6264f47871/bsc/testnet/archive",
  ROPSTEN: "https://speedy-nodes-nyc.moralis.io/3749d19c2c6dbb6264f47871/eth/ropsten/archive",
  AVALANCHE: "https://api.avax-test.network/ext/bc/C/rpc",
  POLYGON: "https://speedy-nodes-nyc.moralis.io/3749d19c2c6dbb6264f47871/polygon/mumbai/archive",
  FANTOM: "https://rpc.testnet.fantom.network/",
  TRON: "https://api.shasta.trongrid.io/",
  CELO: "https://alfajores-forno.celo-testnet.org",
  HARMONY: "https://api.s0.b.hmny.io",
  XDAI: "https://sokol.poa.network",
  UNIQUE: "https://rpc-opal.unique.network/",
  TEZOS: "https://hangzhounet.smartpy.io",
  VELAS: "https://explorer.testnet.velas.com/rpc",
  IOTEX: "https://babel-api.testnet.iotex.io",
  AURORA: "https://testnet.aurora.dev/",
  GODWOKEN: "https://godwoken-testnet-web3-v1-rpc.ckbapp.dev",
  GATECHAIN: "https://meteora-evm.gatenode.cc",
  VECHAIN: "https://sync-testnet.veblocks.net",
}

const Chain: any = {
  ELROND: 2,
  HECO: 3,
  BSC: 4,
  ETHEREUM: 5,
  AVALANCHE: 6,
  POLYGON: 7,
  FANTOM: 8,
  TRON: 9,
  CELO: 11, //11
  HARMONY: 12, //12
  ONT: 13, //13
  XDAI: 14, //14
  ALGORAND: 15, //15
  FUSE: 16, // 16
  UNIQUE: 17, // 17
  TEZOS: 18, // 18
  VELAS: 19, // 19
  IOTEX: 20, // 20
  AURORA: 21, // 21
  GODWOKEN: 22, // 22
  GATECHAIN: 23, // 23
  VECHAIN: 25, // 25
}

const contractAddresses: any = {
  ELROND: "erd1qqqqqqqqqqqqqpgqnd6nmq4vh8e3xrxqrxgpwfldgp3sje83k4as3lusln",
  // HECO: 3,
  BSC: "0x3Dd26fFf61D2a79f5fB77100d6daDBF073F334E6",
  // ETHEREUM: 5,
  AVALANCHE: "0xDdF1f6B8Ae8cd26dBE7C4C3ed9ac8E6D8B3a4FdC",
  POLYGON: "0x224f78681099D66ceEdf4E52ee62E5a98CCB4b9e",
  FANTOM: "0x9a287810bA8F0564DaDd9F2Ea9B7B2459497416B",
  TRON: "TY46GA3GGdMtu9GMaaSPPSQtqq9CZAv5sK",
  // CELO: 11, //11
  // HARMONY: 12, //12
  // ONT: 13, //13
  // XDAI: 14, //14
  // ALGORAND: 15, //15
  // FUSE: 16, // 16
  // UNIQUE: 17, // 17
  // TEZOS: 18, // 18
  // VELAS: 19, // 19
  // IOTEX: 20, // 20
  // AURORA: 21, // 21
  // GODWOKEN: 22, // 22
  // GATECHAIN: 23, // 23
  VECHAIN: "0x4096e08C5d6270c8cd873daDbEAB575670aad8Bc", // 25
          }

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
          //const nftUri = await NFTcontract.tokenURI(tokenId);
          //const senderAddress = (await event.getTransaction()).from;

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
          //const wrappedData = await axios
          // .get<IERC721WrappedMeta>(baseUri.split("{id}")[0] + tokenId)
          // .catch((e: any) => console.log("Could not fetch data"));
          //const NFTcontract = UserNftMinter__factory.connect(contract,provider);

          //const nftUri = await NFTcontract.tokenURI(tokenId);

          //const senderAddress = (await event.getTransaction()).from;

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
