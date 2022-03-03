import { MikroORM, IDatabaseDriver, Connection, wrap } from "@mikro-orm/core";
import { BridgeEvent, IEvent } from "../entities/IEvent";
import {  IWallet, Wallet } from "../entities/IWallet";
import moment from "moment";

export interface IEventRepo {
  createEvent(e: IEvent): Promise<BridgeEvent | null>;
  createWallet(e: IWallet): Promise<Wallet | null>;
  findEvent(targetAddress: string): Promise<BridgeEvent | null>;
  findWallet(address: string): Promise<Wallet | null>;
  updateEvent(
    actionId: string,
    toChain: string,
    fromChain: string,
    toHash: string
  ): Promise<BridgeEvent>;
  updateElrond(
    actionId: string,
    fromChain: string,
    fromHash: string,
    senderAddress: string,
    nftUri: string
  ): Promise<BridgeEvent>;
  getAllEvents(
    fromChain?: string,
    toChain?: string,
    fromHash?: string,
    chainName?: string
  ): Promise<BridgeEvent[] | null>;
  getMetrics(): Promise<{
    totalTx:number,
    totalWallets: number
  } | null>;
  getDashboard(period: number): Promise<{
    events: BridgeEvent[];
    count: number;
  } | null>;
}

export default function createEventRepo({
  em,
}: MikroORM<IDatabaseDriver<Connection>>): IEventRepo {
  return {
    async getAllEvents(
      fromChain = undefined,
      toChain = undefined,
      fromHash = undefined,
      chainName = undefined
    ) {
      let events = await em.find(
        BridgeEvent,
        {},
        { cache: true, orderBy: { createdAt: "DESC" }, limit: 12 }
      );

      if (fromChain) {
        events = await em.find(BridgeEvent, { fromChain });
      } else if (toChain) {
        events = await em.find(BridgeEvent, { toChain });
      } else if (fromHash) {
        events = await em.find(BridgeEvent, { fromHash });
      } else if (chainName) {
        // events where the chainName is a substring of the fromChainName or toChainName
        events = events.filter((event) => {
          return (
            event?.toChainName?.includes(chainName.toUpperCase()) ||
            event?.fromChainName?.includes(chainName.toUpperCase())
          );
        });
      }

      return events;
    },
    async createEvent(e) {
      const event = new BridgeEvent(e);
      await em.persistAndFlush(event);
      return event;
    },
    async createWallet(e) {
      const wallet = new Wallet({
        ...e,
        address: e.address.toLowerCase()
      });
      await em.persistAndFlush(wallet);
      return wallet;

    },
    async findEvent(targetAddress) {
      return await em.findOne(BridgeEvent, { targetAddress });
    },
    async findWallet(address) {
      return await em.findOne(Wallet, { address: address.toLowerCase()});
    },
    async updateEvent(actionId, toChain, fromChain, toHash) {
      const waitEvent = await new Promise<BridgeEvent>(
        async (resolve, reject) => {
          let event = await em.findOne(BridgeEvent, {
            $and: [
              { actionId: actionId.toString() },
              { fromChain: fromChain!.toString() },
            ],
          });

          const interval = setInterval(async () => {
            if (event) {
              clearInterval(interval);
              resolve(event);
              return;
            }
            console.log("waiting for event", actionId, fromChain, toChain);
            event = await em.findOne(BridgeEvent, {
              $and: [
                { actionId: actionId.toString() },
                { fromChain: fromChain!.toString() },
              ],
            });
          }, 100);

          setTimeout(() => {
            clearInterval(interval);
            reject("no promise");
          }, 20000);
        }
      );
      wrap(waitEvent).assign({ toHash, status: "Completed", toChain }, { em });
      await em.flush();
      return waitEvent;
    },
    async updateElrond(actionId, fromChain, fromHash, senderAddress, nftUri) {
      const waitEvent = await new Promise<BridgeEvent>(
        async (resolve, reject) => {
          let event = await em.findOne(BridgeEvent, {
            $and: [
              { actionId: actionId.toString() },
              { fromChain: fromChain.toString() },
            ],
          });

          const interval = setInterval(async () => {
            if (event) {
              clearInterval(interval);
              resolve(event);
              return;
            }
            event = await em.findOne(BridgeEvent, {
              $and: [
                { actionId: actionId.toString() },
                { fromChain: fromChain!.toString() },
              ],
            });
          }, 100);

          setTimeout(() => {
            clearInterval(interval);
            reject("no promise");
          }, 20000);
        }
      );
      wrap(waitEvent).assign(
        { fromHash, status: "Completed", senderAddress, nftUri },
        { em }
      );
      await em.flush();
      return waitEvent;
    },
    async getMetrics() {

      const totalTx = await em.count(BridgeEvent, {});
      const totalWallets = await em.count(Wallet, {});
      

      return {
        totalTx,
        totalWallets
      }
    },
    async getDashboard(period) {
      console.log(period);
      const now = new Date();
      const a = moment(now).subtract(period, "days").toDate();
      let [events, count] = await em.findAndCount(
        BridgeEvent,
        {
          createdAt: {
            $gte: a,
            $lt: now,
          },
        },

        { cache: true, orderBy: { createdAt: "DESC" } }
      );

      return { events, count };
    },
  };
}
