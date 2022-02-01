import { PrismaClient } from ".prisma/client";
import { IEvent } from "../entities/IEvent";

export interface IEventRepo {
  createEvent(e: IEvent): Promise<void>;
}

export default function createEventRepo(prisma: PrismaClient): IEventRepo {
  return {
    async createEvent(e) {
      await prisma.event.create({ data: e });
      return;
    },
  };
}
