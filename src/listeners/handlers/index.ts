import axios from "axios";
import config, { getChain, getTelegramTemplate } from "../../config";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import {  IEvent } from "../../entities/IEvent";
import { chainNonceToName } from "../../config";
import { clientAppSocket } from "../../index";
import cron from 'node-cron'
import { currency } from "../../config";
import { IDatabaseDriver, Connection, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../../business-logic/repo";
import moment from "moment";

export interface IEventhandler {
  actionId: string;
  from: string;
  to: string;
  sender: string;
  target: string;
  hash: string;
  tokenId: string;
  type: "Transfer" | "Unfreeze";
  txFees: string;
  uri: string;
  contract: string;
  dollarFees?: string;
  createdAt?: Date
}


interface HanderOptions {
  notLive?: boolean
}

const evmNonces = config.web3.map((c) => c.nonce);

const getExchageRate = async () => (await axios('https://xp-exchange-rates.herokuapp.com/exchange/batch_data')).data;

export const calcDollarFees = (txFees: any, exchangeRate: number, fromChain:string) => {
  if (fromChain === config.algorand.nonce) {
      return String(+txFees * exchangeRate)
  }
  if (fromChain === config.tron.nonce) {
      return new BigNumber(txFees).shiftedBy(-6).multipliedBy(exchangeRate.toFixed(2)).toString()
  }

  return new BigNumber(ethers.utils.formatEther(txFees?.toString() || ""))
    .multipliedBy(exchangeRate.toFixed(2))
    .toString();
};

//getting exchange rate api every 3 mins
let exchangeRates: any = {};

(async () => {
  exchangeRates = (await getExchageRate())
})()
cron.schedule('*/3 * * * *', async () => {
  exchangeRates = (await getExchageRate())
})


export const executedEventHandler = (
  em: EntityManager<IDatabaseDriver<Connection>>,
  chain: string
) => async ({
  fromChain,
  toChain,
  action_id,
  hash,
}: {
  fromChain: number;
  toChain: number;
  action_id: string;
  hash: string;
}) => {
    if (!fromChain || chain !== String(fromChain)) return;
    console.log(
      {
        fromChain,
        toChain,
        action_id,
        hash,
      },
      "tx_executed_event"
    );
    const checkSuccess =async () =>{
      if (evmNonces.includes(String(toChain))) {
        const rpc = getChain(String(toChain))
        const provider = new ethers.providers.JsonRpcProvider(rpc?.node);
        const txReceipt = await provider?.waitForTransaction(hash);
        console.log("txReceipt:", txReceipt)
        const bool = (txReceipt) ? true : false;
        console.log("status flag:", bool)
        return bool;
      }else{
        return true;
      }
    }
      const actionIdOffset = getChain(String(fromChain))?.actionIdOffset || 0;

    try {
      const updated = await createEventRepo(em).updateEvent(
        String(Number(action_id) - actionIdOffset),
        toChain.toString(),
        fromChain.toString(),
        hash,
        checkSuccess() 
      );
      if (!updated) return;
      console.log(updated, "updated");

      if (
        updated.status === "Completed" &&
        updated.toChain &&
        evmNonces.includes(updated.toChain)
      ) {
      }

      if (updated.toChain === config.algorand.nonce) {
        console.log("algo update");
        console.log(updated.toHash?.split("-"));
        if (updated.toHash?.split("-").length! > 2) {
          clientAppSocket.emit("updateEvent", updated);
        }
        return;
      }

      clientAppSocket.emit("updateEvent", updated);
    } catch (e) {
      console.error(e);
    }
  };

export const eventHandler = (em: EntityManager<IDatabaseDriver<Connection>>,) => async ({
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
  createdAt
}: IEventhandler, 
options?: HanderOptions ) => {



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
    targetAddress: target,
    nftUri: uri,
    contract,
    dollarFees: exchangeRates ? calcDollarFees(txFees, exchangeRates[currency[from]], from) : '',
    createdAt: createdAt? createdAt : moment().utcOffset(0).toDate()
  };


  const [doc] = await Promise.all([
    (async () => {
      return await createEventRepo(em.fork()).createEvent(event);
    })(),
    (async () => {
      return await createEventRepo(em.fork()).saveWallet(event.senderAddress, event.targetAddress!)

    })(),

  ]);

  if (doc && !options?.notLive) {
    console.log(doc);

    setTimeout(() => clientAppSocket.emit("incomingEvent", doc), Math.random() * 3 * 1000)

    !setTimeout(async () => {
      const updated = await createEventRepo(em.fork()).errorEvent(actionId, from);

      if (updated) {
        clientAppSocket.emit("updateEvent", updated);

        try {
          console.log("before telegram operation")
          axios.get(`https://api.telegram.org/bot${config.telegramBotToken}
            /sendMessage?chat_id=${config.telChatId}&text=${getTelegramTemplate(doc)}&parse_mode=HTML`
          );
        } catch (err) {
          console.log(err)
        }
      }
    }, 1000 * 60 * 20);
  }
};


