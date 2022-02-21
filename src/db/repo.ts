import {
  MikroORM,
  IDatabaseDriver,
  Connection,
  wrap,
  Filter,
} from "@mikro-orm/core";
import { BridgeEvent, IEvent } from "../entities/IEvent";

export interface IEventRepo {
  createEvent(e: IEvent): Promise<void>;
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
      console.log(events);
      return events;
    },
    async createEvent(e) {
      return await em.persistAndFlush(new BridgeEvent(e));
      // await em.create(BridgeEvent, e);
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
      while (!event) {
        console.log("waiting for event", actionId, fromChain, toChain);
        event = await em.findOne(BridgeEvent, {
          $and: [
            { actionId: actionId.toString() },
            { fromChain: fromChain.toString() },
          ],
        });
      }
      if (!event) throw new Error("Event not found");
      wrap(event).assign({ toHash, status: "Completed", toChain }, { em });
      await em.flush();
      return event;
    },
  };
}
