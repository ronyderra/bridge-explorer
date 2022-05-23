import { IEvent } from "../../entities/IEvent";
import { chainNonceToName } from "../../config";
import { IEventRepo } from "../../db/repo";
import { saveWallet } from "../../db/helpers";
import { chainNonceToId } from "../../config";
import { io as clientAppSocket } from "../../index";
import axios from "axios";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";

export interface IEventhandler {
  actionId: string;
  from: string;
  to: string;
  sender: string;
  target: string;
  hash: string;
  tokenId: string;
  type: 'Transfer' | 'Unfreeze';
  txFees: string;
  uri: string;
  contract: string;
  dollarFees?:string
}

export const eventHandler = (eventRepo: IEventRepo) =>  async ({
  actionId,
  from,
  to,
  sender,
  target,
  hash,
  tokenId,
  type,
  txFees,
  uri,
  contract,
  dollarFees
}: IEventhandler) => {
  const event: IEvent = {
    chainName: chainNonceToName(from),
    fromChain: from,
    fromChainName: chainNonceToName(from),
    toChainName: chainNonceToName(to),
    fromHash: hash,
    actionId,
    tokenId,
    type,
    status: "Pending",
    toChain: to,
    txFees: txFees,
    senderAddress: sender,
    targetAddress : target,
    nftUri: uri,
    dollarFees,
    contract,
  };


  const [doc] = await Promise.all([
    (async () => {
      return await eventRepo.createEvent(event);
    })(),
    (async () => {
      await saveWallet(
        eventRepo,
        event.senderAddress,
        event.targetAddress
      );
    })(),
  ])

  if (doc) {
    console.log(doc);
    clientAppSocket.emit("incomingEvent", doc);

    setTimeout(async () => {
        const updated = await eventRepo.errorEvent(
          actionId,
          from
        );

        if (updated) {
          clientAppSocket.emit("updateEvent", updated);
        }
      }, 1000 * 120 * 2);
  }


};



export const getExchageRate = async (chain:string) => {

    const id = chainNonceToId(chain)

    const res = await axios(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);

      return res.data[id].usd;
}


export const calcDollarFees = (txFees:any, exchangeRate:number) => {
    return new BigNumber(
        ethers.utils.formatEther(txFees?.toString() || "")
      )
        .multipliedBy(exchangeRate)
        .toString()
}