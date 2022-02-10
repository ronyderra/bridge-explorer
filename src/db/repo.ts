import { MikroORM, IDatabaseDriver, Connection, wrap } from "@mikro-orm/core";
import { BridgeEvent, IEvent } from "../entities/IEvent";

export interface IEventRepo {
  createEvent(e: IEvent): Promise<void>;
  findEvent(targetAddress: string): Promise<BridgeEvent | null>;
  updateEvent(
    actionId: string,
    chainNonce: string,
    toHash: string
  ): Promise<BridgeEvent>;
  getAllEvents(
    fromChain?: string,
    toChain?: string,
    fromHash?: string
  ): Promise<BridgeEvent[]>;
}

export default function createEventRepo({
  em,
}: MikroORM<IDatabaseDriver<Connection>>): IEventRepo {
  return {
    async getAllEvents(
      fromChain = undefined,
      toChain = undefined,
      fromHash = undefined
    ) {
      let events = await em.find(BridgeEvent, {});

      if (fromChain) {
        events = await em.find(BridgeEvent, { fromChain });
      } else if (toChain) {
        events = await em.find(BridgeEvent, { toChain });
      } else if (fromHash) {
        events = await em.find(BridgeEvent, { fromHash });
      }
      console.log(events);
      return events;
    },
    async createEvent(e) {
      return await em.persistAndFlush(new BridgeEvent(e));
    },
    async findEvent(targetAddress) {
      return await em.findOne(BridgeEvent, { targetAddress });
    },
    async updateEvent(actionId, chainNonce, toHash) {
      const event = await em.findOne(BridgeEvent, {
        actionId,
        fromChain: chainNonce,
      });
      if (!event) throw new Error("Event not found");
      wrap(event).assign({ toHash, status: "success" }, { em });
      await em.flush();
      return event;
    },
  };
}
