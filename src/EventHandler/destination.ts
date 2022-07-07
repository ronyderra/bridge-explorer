import config, { getChain } from "../config";
import { ethers } from "ethers";
import { clientAppSocket } from "../index";
import { IDatabaseDriver, Connection, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../business-logic/repo";

const evmChainNumbers = config.web3.map((c) => c.nonce);

export const destinationEventHandler = (em: EntityManager<IDatabaseDriver<Connection>>, chain: string) => async ({
  fromChain, toChain,
  action_id, hash,
}: {
  fromChain: number;
  toChain: number;
  action_id: string;
  hash: string;
}) => {

  console.log("destination.ts - line 21 destination_event", {
    fromChain,
    toChain,
    action_id,
    hash
  });

  const isToChainEvm = evmChainNumbers.includes(String(toChain)) && toChain !== 25 && toChain !== 14 ? true : false
  const chainData = isToChainEvm && getChain(String(toChain))
  const provider = chainData && new ethers.providers.JsonRpcProvider(chainData?.node);

  const txReceipt = await Promise.all([
    (async () => {
      if (provider) {
        const res = await provider?.waitForTransaction(hash);
        return res;
      }
    })(),
  ]);

  const success = txReceipt ? true : false
  console.log("destination.ts - line 102 - success: " + hash + " " + success)

  const actionIdOffset = getChain(String(fromChain))?.actionIdOffset || 0;

  try {
    const updated = await createEventRepo(em).updateEvent(
      String(Number(action_id) - actionIdOffset),
      toChain.toString(),
      fromChain.toString(),
      hash,
      isToChainEvm ? success : true
    );
    if (!updated) return;
    console.log(updated, "updated");

    if (
      updated.status === "Completed" &&
      updated.toChain &&
      evmChainNumbers.includes(updated.toChain)
    ) {
    }

    if (updated.toChain === config.algorand.nonce) {
      console.log("algo update");
      console.log(updated.toHash?.split("-"));
      if (updated.toHash?.split("-").length! >= 2) {
        clientAppSocket.emit("updateEvent", updated);
      }
      return;
    }

    clientAppSocket.emit("updateEvent", updated);
  } catch (e) {
    console.error(e);
  }
};