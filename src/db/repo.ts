import { MikroORM, IDatabaseDriver, Connection, wrap } from "@mikro-orm/core";
import { BridgeEvent, IEvent } from "../entities/IEvent";

import moment from "moment";

export interface IEventRepo {
  createEvent(e: IEvent): Promise<BridgeEvent | null>;
  findEvent(targetAddress: string): Promise<BridgeEvent | null>;
  updateEvent(
    actionId: string,
    fromChain: string,
    toChain: string,
    toHash: string
  ): Promise<BridgeEvent>;
  getAllEvents(
    fromChain?: string,
    toChain?: string,
    fromHash?: string,
    chainName?: string
  ): Promise<BridgeEvent[] | null>;
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
        { cache: true, orderBy: { createdAt: "DESC" } }
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
    async findEvent(targetAddress) {
      return await em.findOne(BridgeEvent, { targetAddress });
    },
    async updateEvent(actionId, toChain, fromChain, toHash) {
      let event = await em.findOne(BridgeEvent, {
        $and: [
          { actionId: actionId.toString() },
          { fromChain: fromChain.toString() },
        ],
      });
      
      const interval = setInterval(async () => {
        if (event) clearInterval(interval)
        console.log("waiting for event", actionId, fromChain, toChain);
        event = await em.findOne(BridgeEvent, {
          $and: [
            { actionId: actionId.toString() },
            { fromChain: fromChain.toString() },
          ],
        });
      }, 100)

      setTimeout(() => {
        clearInterval(interval)
      }, 4000)

     /* while (!event) {
        console.log("waiting for event", actionId, fromChain, toChain);
        event = await em.findOne(BridgeEvent, {
          $and: [
            { actionId: actionId.toString() },
            { fromChain: fromChain.toString() },
          ],
        });
      }*/
      if (!event) throw new Error("Event not found");
      wrap(event).assign({ toHash, status: "Completed", toChain }, { em });
      await em.flush();
      return event;
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
