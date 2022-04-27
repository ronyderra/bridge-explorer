import { Options } from "@mikro-orm/core";
import config from "./config";
import { BridgeEvent } from "./entities/IEvent";
import { Wallet } from "./entities/IWallet";
import { DailyData } from "./entities/IDailyData";
import { EthNftDto } from "./entities/NftIndex";

export const explorerDB =  {
  clientUrl: config.db,
  entities: [BridgeEvent, Wallet, DailyData],
  type: "mongo",
} as Options;


export const indexerDb = {
  clientUrl: config.indexer_db,
  entities: [EthNftDto],
  type: "mongo",
} as Options;