import { Options } from "@mikro-orm/core";
import config from "./config";
import { BridgeEvent } from "./Intrerfaces/IEvent";
import { Wallet } from "./Intrerfaces/IWallet";
import { DailyData } from "./Intrerfaces/IDailyData";
import { EthNftDto } from "./Intrerfaces/NftIndex";
import { BlockRepo } from "./Intrerfaces/IBlockRepo";

export const explorerDB =  {
  clientUrl: config.db,
  entities: [BridgeEvent, Wallet, DailyData, BlockRepo],
  type: "mongo",
} as Options;

export const indexerDb = {
  clientUrl: config.indexer_db,
  entities: [EthNftDto],
  type: "mongo",
} as Options;