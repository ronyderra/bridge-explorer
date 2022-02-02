import WebSocket from "ws";
import { Base64 } from "js-base64";
import BigNumber from "bignumber.js";
import { IContractEventListener } from "./web3";
import { EvResp } from "../entities/EvResp";

export function elrondEventListener(
  rpc: string,
  contract: string
): IContractEventListener {
  const ws = new WebSocket(rpc);
  ws.send(
    JSON.stringify({
      subscriptionEntries: [
        {
          address: contract,
        },
      ],
    })
  );
  return {
    listen: async () => {
      ws.addEventListener("message", async (ev: any) => {
        const evs: EvResp[] = JSON.parse(ev.data);
        await Promise.all(evs.map(async (ev) => await eventHandler(ev)));
      });
    },
  };
}

function bigIntFromBe(buf: Uint8Array): BigNumber {
  // TODO: something better than this hack
  return new BigNumber(`0x${Buffer.from(buf).toString("hex")}`, 16);
}

const eventHandler = async (event: EvResp) => {
  if (event.topics.length < 5) {
    return undefined;
  }

  const action_id = bigIntFromBe(Base64.toUint8Array(event.topics[1]));
  const tx_fees = bigIntFromBe(
    Base64.toUint8Array(event.topics[event.topics.length - 1])
  );

  switch (event.identifier) {
    case "withdraw": {
      const to = Base64.atob(event.topics[3]);
      const chain_nonce = new Uint32Array(
        Base64.toUint8Array(event.topics[2])
      )[0]; // TODO: Consider LO
      const value = bigIntFromBe(Base64.toUint8Array(event.topics[4]));
      console.log(action_id, chain_nonce, tx_fees, to, value);
    }
    case "withdrawNft": {
      const to = Base64.atob(event.topics[2]);
      console.log(action_id, tx_fees, to, Base64.decode(event.topics[3]));
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

      console.log(action_id, chain_nonce, tx_fees, to);
    }
    default:
      return undefined;
  }
};
