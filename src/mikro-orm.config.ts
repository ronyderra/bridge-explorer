import { Options } from "@mikro-orm/core";
import config from "./config";
import { BridgeEvent } from "./entities/IEvent";
import { Wallet } from "./entities/IWallet";
import { DailyData } from "./entities/IDailyData";

export default {
  clientUrl: config.db,
  entities: [BridgeEvent, Wallet, DailyData],
  type: "mongo",
} as Options;
