import { Options } from "@mikro-orm/core";
import config from "./config";
import { BridgeEvent } from "./entities/IEvent";
import { Wallet } from "./entities/IWallet";

export default {
  clientUrl: config.db,
  entities: [BridgeEvent, Wallet],
  type: "mongo",
} as Options;
