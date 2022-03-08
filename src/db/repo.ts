import { MikroORM, IDatabaseDriver, Connection, wrap } from "@mikro-orm/core";
import { BridgeEvent, IEvent } from "../entities/IEvent";
import { IWallet, Wallet } from "../entities/IWallet";
import { DailyData } from "../entities/IDailyData"
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
    totalTx: number;
    totalWallets: number;
  } | null>;
  saveDailyData() : void,
  getDashboard(period: number | undefined): Promise<DailyData[]>;
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
        { cache: true, orderBy: { createdAt: "DESC" }, limit: 50 }
      );

      if (fromChain) {
        events = await em.find(BridgeEvent, { fromChain });
      } else if (toChain) {
        events = await em.find(BridgeEvent, { toChain });
      } else if (fromHash) {
        events = await em.find(BridgeEvent, { fromHash });
      } else if (chainName) {
        events = events.filter((event) => {
          return (
            event?.toChainName?.includes(chainName.toUpperCase()) ||
            event?.fromChainName?.includes(chainName.toUpperCase()) ||
            event?.fromHash?.includes(chainName) ||
            event?.type?.includes(chainName) ||
            event?.status?.includes(chainName) ||
            event?.senderAddress?.includes(chainName) ||
            event?.toChain?.includes(chainName) ||
            event?.createdAt?.toDateString()?.includes(chainName)
          );
        });
      }

      return events;
    },
    async createEvent(e) {
      const event = new BridgeEvent(e);
      const same = await em.findOne(BridgeEvent, {
        actionId: event.actionId,
        tokenId: event.tokenId,
        fromHash: event.fromHash
      })
      if (same) return same;
      await em.persistAndFlush(event);
      return event;
      

    },
    async createWallet(e) {
      const wallet = new Wallet({
        ...e,
        address: e.address.toLowerCase(),
      });
      await em.persistAndFlush(wallet);
      return wallet;
    },
    async findEvent(targetAddress) {
      return await em.findOne(BridgeEvent, { targetAddress });
    },
    async findWallet(address) {
      return await em.findOne(Wallet, { address: address.toLowerCase() });
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
        totalWallets,
      };
    },
    async saveDailyData(){

      const now = new Date();
      var start = new Date();
        start.setUTCHours(0,0,0,0);

        let [events, count] = await em.findAndCount(
          BridgeEvent,
          {
            createdAt: {
              $gte: start,
              $lt: now,
            },
          },
          { cache: true, orderBy: { createdAt: "DESC" } }
        );
          
          const users:string[] = [];  

          for (const event of events) {
            const sender = event.senderAddress;
            const reciver = event.targetAddress;

            if (sender && !users.includes(sender)) {
              users.push(sender)
            }

            if (reciver && !users.includes(reciver)) {
              users.push(reciver)
            }
          }
         
          const dailyData = new DailyData({
            txNumber: count,
            walletsNumber: users.length,
            date: now.getFullYear()+'/'+(now.getMonth()+1)+'/'+now.getDate()
          })

          const data = await em.findOne(DailyData, {
            date: dailyData.date
          })

          if (data) {
            const {txNumber, walletsNumber} = dailyData

            wrap(data).assign(
              {  txNumber, walletsNumber },
              { em }
            );
            return await em.flush();
          }
          await em.persistAndFlush(dailyData)
          

    },
    async getDashboard(period) {

      if (period && period > 30) return [];

      let events = await em.find(
        DailyData, {},
        { cache: true, orderBy: { createdAt: "DESC" }, limit: period }
      );

      return events
    },
  };
}
