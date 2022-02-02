import { PrismaClient, Event } from ".prisma/client";
import { IEvent } from "../entities/IEvent";

export interface IEventRepo {
  createEvent(e: IEvent): Promise<void>;
  findEvent(targetAddress: string): Promise<Event | null>;
  updateEvent(actionId: string, targetHash: string): Promise<Event>;
}

export default function createEventRepo(prisma: PrismaClient): IEventRepo {
  return {
    async createEvent(e) {
      await prisma.event.create({ data: e });
      return;
    },
    async findEvent(targetAddress) {
      return await prisma.event.findFirst({ where: { targetAddress } });
    },
    async updateEvent(id, targetHash) {
      return await prisma.event.update({
        where: { id },
        data: { toHash: targetHash, status: "success" },
      });
    },
  };
}
