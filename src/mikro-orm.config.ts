import { Options } from "@mikro-orm/core";
import config from "./config";
import { BridgeEvent } from "./entities/IEvent";

export default {
  clientUrl: config.db,
  entities: [BridgeEvent],
  type: "mongo",
} as Options;
