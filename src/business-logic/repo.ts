import { IDatabaseDriver, Connection, wrap, EntityManager } from "@mikro-orm/core";
import { BridgeEvent, IEvent } from "../Intrerfaces/IEvent";
import { IWallet, Wallet } from "../Intrerfaces/IWallet";
import { DailyData } from "../Intrerfaces/IDailyData";
import { chainNonceToName } from "../config";
import moment from "moment";
import config from "../config";

export interface IEventRepo {
  createEvent(e: IEvent, functionName?: string): Promise<BridgeEvent | undefined>;
  createWallet(e: IWallet): Promise<Wallet | null>;
  findEvent(targetAddress: string): Promise<BridgeEvent | null>;
  findEventByHash(fromHash: string): Promise<BridgeEvent | null>;
  findEventByToHash(toHash: string): Promise<BridgeEvent | null>;
  findWallet(address: string): Promise<Wallet | null>;
  updateEvent(
    actionId: string,
    toChain: string,
    fromChain: string,
    toHash: string,
    statusFlag?: boolean
  ): Promise<BridgeEvent | undefined>;
  updateElrond(
    actionId: string,
    fromChain: string,
    fromHash: string,
    senderAddress: string,
    nftUri: string
  ): Promise<BridgeEvent>;
  errorEvent(
  hash:string
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
    toHash?: string,
    chainName?: string,
    pendingSearch?: string,
    targetAddress?: string,
    offset?: number
  ): Promise<{ events: BridgeEvent[]; count: number } | null>;
  getMetrics(): Promise<{
    totalTx: number;
    totalWallets: number;
  } | null>;
  saveDailyData(): void;
  getDashboard(period: number | undefined): Promise<DailyData[]>;
  saveWallet(senderAddress: string, to: string): Promise<void>
  getLastEvent(chainName: string): Promise<BridgeEvent | undefined>
}

export default function createEventRepo(em: EntityManager<IDatabaseDriver<Connection>>): IEventRepo {
  return {

    async getEventsForCSV(startDate = undefined, endDate = undefined, searchQuery = undefined) {
      let events = await em.find(BridgeEvent, {});

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
    async getAllEvents(sort = "DESC", fromChain = undefined, status = undefined, fromHash = undefined, toHash = undefined, chainName = undefined, pendingSearch = undefined, 
    targetAddress = undefined, offset = 0
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

      if (fromChain && !fromHash) {
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
      }
      else if (fromHash && fromChain) {
        events = await em.find
          (BridgeEvent, { $and: [{ fromHash }, { fromChain }] });
      }
      else if (fromHash) {
        events = await em.find
          (BridgeEvent, { fromHash });
      } else if (toHash) {
        events = await em.find(BridgeEvent, { toHash });
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
            event?.toHash?.includes(chainName) ||
            event?.collectionName?.includes(chainName) ||
            event?.type?.includes(chainName) ||
            event?.status?.includes(chainName) ||
            event?.senderAddress?.includes(chainName) ||
            event?.toChain?.includes(chainName) ||
            event?.targetAddress?.includes(chainName) ||
            event?.createdAt?.toDateString()?.includes(chainName)
          );
        });
        count = events.length;
        events = events.slice(offset * 50, offset * 50 + 50);
      }
      console.log("number of results:", count);

      return { events, count };
    },
    async createEvent(e, functionName=undefined) {
      const event = new BridgeEvent(e);
      const same = await em.findOne(BridgeEvent, {
        fromHash: event.fromHash,
        fromChain: event.fromChain,
      });
      if (same) return undefined;
      await em.persistAndFlush(event);
      if (functionName && !same) {
        console.log(functionName, e)
      }
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
    async findEventByToHash(toHash) {
      return await em.findOne(BridgeEvent, {
        toHash,
      });
    },
    async findWallet(address) {
      return await em.findOne(Wallet, { address: address.toLowerCase() });
    },
    async updateEvent(actionId, toChain, fromChain, toHash, statusFlag = true) {
      console.log("before update - statusFlag:", statusFlag)
      const statusString = (statusFlag == true) ? "Completed" : "Failed";
      console.log("statusString:", statusString)
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
            status: statusString,
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

      console.log("update Elrond", { actionId, fromChain, fromHash, senderAddress, nftUri });

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
    async errorEvent(hash) {
      const event = await em.findOne(BridgeEvent, {
        fromHash: hash
      });

      if (event && event.status === "Pending") {
        console.log('changing status to Failed', event);
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
      const dailyData = new DailyData({
        txNumber: count,
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
    },
    async getLastEvent(chainName: string) {
      console.log(chainName)
      const event = await em.find(BridgeEvent, { chainName: chainName },{orderBy: { createdAt: -1}  , limit: 1}) ;
      return event ? event[0] : undefined
    }
  }
};

