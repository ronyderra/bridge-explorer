import WebSocket from "ws";
import { Base64 } from "js-base64";
import BigNumber from "bignumber.js";
import { IContractEventListener } from "./web3";
import { EvResp } from "../entities/EvResp";
import { IEventRepo } from "../db/repo";
import config, { chainNonceToName } from "../config";
import axios from "axios";
import { IERC721WrappedMeta } from "../entities/ERCMeta";
import { IEvent } from "../entities/IEvent";
import { io as clientAppSocket } from "../index";


// TODO: Save bridge events to db
export function elrondEventListener(
  rpc: string,
  contract: string,
  chainName: string,
  chainNonce: string,
  eventRepo: IEventRepo
): IContractEventListener {
  console.log(rpc);
  const ws = new WebSocket(rpc);
  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        subscriptionEntries: [
          {
            address: contract,
          },
        ],
      })
    );
  };
  return {

    listen: async () => {
      ws.addEventListener("message", async (ev: any) => {
        const evs: EvResp[] = JSON.parse(ev.data);
        console.log(evs);
        await Promise.all(
          evs.map(
            async (ev) =>
              await eventHandler(ev, chainName, chainNonce, eventRepo)
          )
        );
      });
    },
  };
}

function bigIntFromBe(buf: Uint8Array): BigNumber {
  // TODO: something better than this hack
  return new BigNumber(`0x${Buffer.from(buf).toString("hex")}`, 16);
}

const eventHandler = async (
  event: EvResp,
  chainName: string,
  chainNonce: string,
  eventRepo: IEventRepo
) => {
  if (event.topics.length < 5) {
    return undefined;
  }

  const action_id = bigIntFromBe(Base64.toUint8Array(event.topics[1]));
  const tx_fees = bigIntFromBe(
    Base64.toUint8Array(event.topics[event.topics.length - 1])
  );

  switch (event.identifier) {
    // case "withdraw": {
    //   const to = Base64.atob(event.topics[3]);
    //   const chain_nonce = new Uint32Array(
    //     Base64.toUint8Array(event.topics[2])
    //   )[0]; // TODO: Consider LO
    //   const value = bigIntFromBe(Base64.toUint8Array(event.topics[4]));
    //   console.log(action_id, chain_nonce, tx_fees, to, value);
    // }
    case "withdrawNft": {
      const to = Base64.atob(event.topics[3]);
      const burner = Base64.decode(event.topics[4]);
      const uri = Base64.decode(event.topics[5]);
      const wrappedData = await axios.get<IERC721WrappedMeta>(uri);
      console.log("wrapped", wrappedData);
      console.log(
        "Unfreez",
        action_id.toString(),
        tx_fees.toString(),
        to,
        Base64.decode(event.topics[3])
      );
      const eventObj: IEvent = {
        actionId: action_id.toString(),
        chainName: chainName,
        tokenId: wrappedData?.data?.wrapped.tokenId,
        fromChain: chainNonce,
        toChain: wrappedData?.data?.wrapped?.origin ?? "N/A",
        fromChainName: chainNonceToName(chainNonce),
        toChainName: chainNonceToName(
          wrappedData?.data?.wrapped?.origin ?? "N/A"
        ),
        txFees: tx_fees.toString(),
        type: "Unfreeze",
        status: "Pending",
        fromHash: "N/A",
        toHash: undefined,
        senderAddress: "N/A",
        targetAddress: to.toString(),
        nftUri: wrappedData?.data?.wrapped?.original_uri,
      };
      console.log("unfreez event: ", eventObj);
      const doc = await eventRepo.createEvent(eventObj);
      clientAppSocket.emit("incomingEvent", doc);
      setTimeout(async () => {
        const updated = await eventRepo.errorEvent(action_id.toString(),chainNonce);
        console.log(updated, 'in errored');
        if (updated) {
          clientAppSocket.emit("updateEvent", updated);
        }
    }, 1000 * 60)
    }
    case "freezeSendNft": {
      const to = Base64.atob(event.topics[3]);
      const chain_nonce = new Uint32Array(
        Base64.toUint8Array(event.topics[2])
      )[0]; // TODO: Consider LO
      const tokenId = Base64.decode(event.topics[4]);
      const nonce = bigIntFromBe(Base64.toUint8Array(event.topics[5]));
      const name = Base64.decode(event.topics[6]);
      const image = Base64.decode(event.topics[7]);

      // TODO: add event to db
      const eventObj: IEvent = {
        actionId: action_id.toString(),
        chainName,
        tokenId: tokenId.toString(),
        fromChain: chainNonce,
        toChain: chain_nonce.toString(),
        fromChainName: chainNonceToName(chainNonce),
        toChainName: chainNonceToName(chain_nonce.toString()),
        fromHash: "N/A",
        txFees: tx_fees.toString(),
        type: "Transfer",
        status: "Pending",
        toHash: undefined,
        senderAddress: "N/A",
        targetAddress: to,
        nftUri: "N/A",
      };

      console.log("transfer event: ", eventObj);
      const doc = await eventRepo.createEvent(eventObj);
      clientAppSocket.emit("incomingEvent", doc);
      setTimeout(async () => {
        const updated = await eventRepo.errorEvent(action_id.toString(),chainNonce);
        console.log(updated, 'in errored');
        if (updated) {
          clientAppSocket.emit("updateEvent", updated);
        }
    }, 1000 * 60)

      console.log(
        "transfer",
        action_id.toString(),
        chain_nonce.toString(),
        tx_fees.toString(),
        to
      );
    }
    default:
      return undefined;
  }
};
