import {
  IDatabaseDriver,
  Connection,
  wrap,
  EntityManager
} from "@mikro-orm/core";
import { BridgeEvent, IEvent } from "../entities/IEvent";
import { IWallet, Wallet } from "../entities/IWallet";
import { DailyData } from "../entities/IDailyData";
import { chainNonceToName } from "../config";
import moment from "moment";

import config from "../config";


export interface IEventRepo {
  createEvent(e: IEvent): Promise<BridgeEvent | undefined>;
  createWallet(e: IWallet): Promise<Wallet | null>;
  findEvent(targetAddress: string): Promise<BridgeEvent | null>;
  findEventByHash(fromHash: string): Promise<BridgeEvent | null>;
  findWallet(address: string): Promise<Wallet | null>;
  updateEvent(
    actionId: string,
    toChain: string,
    fromChain: string,
    toHash: string
  ): Promise<BridgeEvent | undefined>;
  updateElrond(
    actionId: string,
    fromChain: string,
    fromHash: string,
    senderAddress: string,
    nftUri: string
  ): Promise<BridgeEvent>;
  errorEvent(
    actionId: string,
    fromChain: string
  ): Promise<BridgeEvent | undefined>;
  getEventsForCSV(
    startDate?: string,
    endDate?: string,
    searchQuery?: string
  ): Promise<BridgeEvent[]>;
  getAllEvents(
    sort?: string,
    fromChain?: string,
    toChain?: string,
    fromHash?: string,
    chainName?: string,
    pendingSearch?: string,
    offset?: number
  ): Promise<{ events: BridgeEvent[]; count: number } | null>;
  getMetrics(): Promise<{
    totalTx: number;
    totalWallets: number;
  } | null>;
  saveDailyData(): void;
  getDashboard(period: number | undefined): Promise<DailyData[]>;
  saveWallet(senderAddress: string, to: string): Promise<void>
}

export default function createEventRepo(em: EntityManager<IDatabaseDriver<Connection>>): IEventRepo {
  return {
    async getEventsForCSV(
      startDate = undefined,
      endDate = undefined,
      searchQuery = undefined
    ) {
      // get events between startDate and endDate
      let events = await em.find(BridgeEvent, {});

      // filter by startDate and endDate

      if (startDate && endDate) {
        events = events.filter((e) => {
          const date = moment(e.createdAt);
          return (
            date.isSameOrAfter(new Date(startDate)) &&
            date.isSameOrBefore(new Date(endDate))
          );
        });
      } else if (startDate) {
        events = events.filter((e) => {
          const date = moment(e.createdAt);
          return date.isSameOrAfter(new Date(startDate));
        });
      } else if (endDate) {
        events = events.filter((e) => {
          const date = moment(e.createdAt);
          return date.isSameOrBefore(new Date(endDate));
        });
      }

      if (searchQuery) {
        events = events.filter(
          (e) =>
            e?.senderAddress?.includes(searchQuery) ||
            e?.targetAddress?.includes(searchQuery) ||
            e?.fromChainName?.includes(searchQuery) ||
            e?.toChainName?.includes(searchQuery)
        );
      }

      return events;
    },
    async getAllEvents(
      sort = "DESC",
      fromChain = undefined,
      status = undefined,
      fromHash = undefined,
      chainName = undefined,
      pendingSearch = undefined,
      offset = 0
    ) {
      let [events, count] = await em.findAndCount(
        BridgeEvent,
        {
          //status,
          // chainName,
        },
        {
          cache: true,
          orderBy: { createdAt: sort === "DESC" ? "DESC" : "ASC" },
          limit: 50,
          offset: offset * 50,
        }
      );

      if (fromChain) {
        events = await em.find(BridgeEvent, { fromChain });
      } else if (status) {
        events = await em.find(
          BridgeEvent,
          { status },
          {
            cache: true,
            orderBy: { createdAt: sort === "DESC" ? "DESC" : "ASC" },
          }
        );

        count = events.length;
        events = events.slice(offset * 50, offset * 50 + 50);
      } else if (fromHash) {
        events = await em.find(BridgeEvent, { fromHash });
      } else if (pendingSearch) {
        console.log("d");
        events = await em.find(
          BridgeEvent,
          {
            status: "Failed",
          },
          {
            cache: true,
            orderBy: { createdAt: sort === "DESC" ? "DESC" : "ASC" },
          }
        );
        events = events.filter((event) => {
          return (
            event?.toChainName?.includes(pendingSearch.toUpperCase()) ||
            event?.fromChainName?.includes(pendingSearch.toUpperCase()) ||
            event?.fromHash?.includes(pendingSearch) ||
            event?.type?.includes(pendingSearch) ||
            event?.status?.includes(pendingSearch) ||
            event?.senderAddress?.includes(pendingSearch) ||
            event?.toChain?.includes(pendingSearch) ||
            event?.createdAt?.toDateString()?.includes(pendingSearch)
          );
        });
        count = events.length;
        events = events.slice(offset * 50, offset * 50 + 50);
      } else if (chainName) {
        events = await em.find(
          BridgeEvent,
          {},
          {
            cache: true,
            orderBy: {
              createdAt: sort === "DESC" ? "DESC" : "ASC",
            } /*offset: offset * 50*/,
          }
        );
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
        count = events.length;
        events = events.slice(offset * 50, offset * 50 + 50);
      }
      console.log(count);

      return { events, count };
    },
    async createEvent(e) {
      const event = new BridgeEvent(e);
      const same = await em.findOne(BridgeEvent, {
        fromHash: event.fromHash,
        fromChain: event.fromChain,
      });
      if (same) return undefined;
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
    async findEventByHash(fromHash) {
      return await em.findOne(BridgeEvent, {
        fromHash,
      });
    },
    async findWallet(address) {
      return await em.findOne(Wallet, { address: address.toLowerCase() });
    },
    async updateEvent(actionId, toChain, fromChain, toHash) {
      console.log("enter update", { actionId, fromChain, toChain });
      if (toHash === "N/A") return undefined;

      try {
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
              console.log("waiting for event", {
                actionId,
                fromChain,
                toChain,
              });
              event = await em.findOne(BridgeEvent, {
                $and: [
                  { actionId: actionId.toString() },
                  { fromChain: fromChain!.toString() },
                ],
              });
            }, 5000);

            setTimeout(() => {
              clearInterval(interval);
              reject("no promise");
            }, 1000 * 60 * 15);
          }
        );

        if (
          waitEvent.status === "Completed" &&
          toChain !== config.algorand.nonce
        )
          return undefined;

        wrap(waitEvent).assign(
          {
            toHash: waitEvent.toHash ? waitEvent.toHash + "-" + toHash : toHash,
            status: "Completed",
            toChain,
            toChainName: chainNonceToName(toChain),
          },
          { em }
        );
        await em.flush();
        return waitEvent;
      } catch (e) {
        console.log(e);
      }
    },
    async updateElrond(actionId, fromChain, fromHash, senderAddress, nftUri) {
      console.log("update Elrond", {
        actionId,
        fromChain,
        fromHash,
        senderAddress,
        nftUri,
      });
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
          }, 500);

          setTimeout(() => {
            clearInterval(interval);
            reject("no promise");
          }, 60000);
        }
      );
      wrap(waitEvent).assign(
        { fromHash, status: "Completed", senderAddress, nftUri },
        { em }
      );
      await em.flush();
      return waitEvent;
    },
    async errorEvent(actionId, fromChain) {
      const event = await em.findOne(BridgeEvent, {
        $and: [
          { actionId: actionId.toString() },
          { fromChain: fromChain.toString() },
        ],
      });

      if (event && event.status === "Pending") {
        console.log('timeout', event);
        wrap(event).assign({ status: "Failed" }, { em });
        await em.flush();
        return event;
      }

      return undefined;
    },
    async getMetrics() {
      const totalTx = await em.count(BridgeEvent, {});
      const totalWallets = await em.count(Wallet, {});

      return {
        totalTx,
        totalWallets,
      };
    },
    async saveDailyData() {
      const now = new Date();
      var start = new Date();
      start.setUTCHours(0, 0, 0, 0);

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

      const users: string[] = [];

      for (const event of events) {
        const sender = event.senderAddress;
        const reciver = event.targetAddress;

        if (sender && !users.includes(sender)) {
          users.push(sender);
        }

        if (reciver && !users.includes(reciver)) {
          users.push(reciver);
        }
      }

      /*const rates = await axios(
        `https://api.coingecko.com/api/v3/simple/price?ids=${chains.map(c => c.id).join(
          ","
        )}&vs_currencies=usd`
      );*/

      const dailyData = new DailyData({
        txNumber: count,
        //exchangeRates: Object.keys(rates.data).reduce((acc:{[x: string]:string}, coin:string) => {
        // return {
        // ...acc,
        // [coin]: rates.data[coin].usd
        // }
        // }, {}),
        walletsNumber: users.length,
        date:
          now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + now.getDate(),
      });

      console.log(dailyData);

      const data = await em.findOne(DailyData, {
        date: dailyData.date,
      });

      if (data) {
        const { txNumber, walletsNumber /*exchangeRates*/ } = dailyData;

        wrap(data).assign(
          { txNumber, walletsNumber /*exchangeRates */ },
          { em }
        );
        return await em.flush();
      }
      await em.persistAndFlush(dailyData);
    },
    async getDashboard(period) {
      if (period && period > 30) return [];

      let events = await em.find(
        DailyData,
        {},
        { cache: true, orderBy: { createdAt: "DESC" }, limit: period }
      );

      return events;
    },
    async saveWallet(senderAddress, to) {
      return Promise.all([
        senderAddress ? this.findWallet(senderAddress) : undefined,
        to ? this.findWallet(to) : undefined
      ]).then(async ([walletFrom, walletTo]) => {
        if (!walletFrom && senderAddress) await this.createWallet({ address: senderAddress });
        if (!walletTo && to && senderAddress !== to) await this.createWallet({ address: to! });
      }).catch((err) => console.log(err))
    }
  };
}

/**
const events = await orm.em.find(
    BridgeEvent, {})

    //@ts-ignore
    Date.prototype.addDays = function(days) {
      var date = new Date(this.valueOf());
      date.setDate(date.getDate() + days);
      return date;
  }

    function getDates(startDate:Date, stopDate:Date) {
      var dateArray = new Array();
      //@ts-ignore
      var currentDate = startDate
            //@ts-ignore
      while (currentDate <= stopDate) {
          dateArray.push(currentDate);
            //@ts-ignore
          currentDate = currentDate.addDays(1);
      }
      return dateArray;
  }
 
    let dailis = getDates(new Date('2022/2/14'), new Date('2022/3/2') )

    console.log(dailis);

  
     dailis.map(d=>({date:d})).forEach((d) => {
        
       
        const date = moment(d.date,  "YYYY/M/D")
    
       
       
        const start = date.startOf('day').add(3, 'hours').toDate()
        const end = date.endOf('day').add(3, 'hours').toDate();



        const ofTheDay = events.filter(e => e.createdAt < end && e.createdAt > start);

        let uniqueWallets: string[] = [];

        ofTheDay.forEach((e) => {
          if (e.targetAddress && !uniqueWallets.includes(e.targetAddress)) {
            uniqueWallets.push(e.targetAddress)
          }

          if (e.senderAddress && !uniqueWallets.includes(e.senderAddress)) {
            uniqueWallets.push(e.senderAddress)
          }

        })

        const daily:IDailyData = {
          txNumber: ofTheDay.length,
          date: moment(d.date).format("YYYY/M/D").toString(),
          walletsNumber: uniqueWallets.length
        }

        console.log(daily);

         const a = orm.em.persist(new DailyData(daily));
         a.flush();
       
        


      })

  
   
   
 */
