import axios from "axios";
import config, { getChain, getTelegramTemplate } from "../config";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { IEvent } from "../Intrerfaces/IEvent";
import { chainNonceToName } from "../config";
import { clientAppSocket } from "../index";
import cron from 'node-cron'
import { currency } from "../config";
import { IDatabaseDriver, Connection, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../business-logic/repo";
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
  collectionName?: string
}

interface HanderOptions {
  notLive?: boolean
}

const evmChainNumbers = config.web3.map((c) => c.nonce);

const getExchageRate = async () => (await axios('https://xp-exchange-rates.herokuapp.com/exchange/batch_data')).data;

export const calcDollarFees = (txFees: any, exchangeRate: number, fromChain: string) => {
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

export const executedEventHandler = (em: EntityManager<IDatabaseDriver<Connection>>,chain: string
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
      "index.ts - line 84 tx_executed_event"
    );

    const isToChainEvm = evmChainNumbers.includes(String(toChain)) ? true : false

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
    console.log("index.ts - line 102 - success: " + hash + " " + success)

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
  createdAt,
  collectionName
}: IEventhandler, options?: HanderOptions) => {

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
    createdAt: createdAt ? createdAt : moment().utcOffset(0).toDate(),
    collectionName
  };
  console.log("index.ts line 176", event)
  const [doc] = await Promise.all([
    (async () => {
      return await createEventRepo(em.fork()).createEvent(event);
    })(),
    (async () => {
      return await createEventRepo(em.fork()).saveWallet(event.senderAddress, event.targetAddress!)
    })(),
  ]);

  if (doc) {
    console.log("------TELEGRAM FUNCTION-----")
    console.log("doc: ", doc);
    console.log("options: ", options?.notLive)

    setTimeout(() => clientAppSocket.emit("incomingEvent", doc), Math.random() * 3 * 1000)

    setTimeout(async () => {
      const updated = await createEventRepo(em.fork()).errorEvent(hash);
      clientAppSocket.emit("updateEvent", updated);
      if (updated) {
        try {
          console.log("before telegram operation")
         await axios.get(`https://api.telegram.org/bot5524815525:AAEEoaLVnMigELR-dl01hgHzwSkbonM1Cxc/sendMessage?chat_id=-553970779&text=${getTelegramTemplate(doc)}&parse_mode=HTML`);
        } catch (err) {
          console.log(err)
        }
      }else{
        console.log("There was no response from error event" , updated)
      }
    }, 1000 * 60 * 20);
  }
};


