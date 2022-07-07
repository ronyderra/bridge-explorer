import axios from "axios";
import { getTelegramTemplate } from "../config";
import { IEvent } from "../Intrerfaces/IEvent";
import { IEventhandler } from "../Intrerfaces/IEventhandler"
import { chainNonceToName } from "../config";
import { clientAppSocket } from "../index";
import { currency } from "../config";
import { IDatabaseDriver, Connection, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../business-logic/repo";
import moment from "moment";
import { calcDollarFees, getExchageRate } from "./eventHandlerHelper"
import cron from 'node-cron'

export const departureEventHandler = (em: EntityManager<IDatabaseDriver<Connection>>,) => async ({
  actionId, from,
  to, sender,
  target, hash,
  tokenId, type,
  txFees, uri,
  contract, createdAt, collectionName }: IEventhandler) => {

  let exchangeRates: any = {};
  (async () => { exchangeRates = (await getExchageRate()) })()
  cron.schedule('*/3 * * * *', async () => { exchangeRates = (await getExchageRate()) })

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
  console.log("departure.ts line 54", event)

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
      } else {
        console.log("There was no response from error event", updated)
      }
    }, 1000 * 60 * 20);
  }
};



