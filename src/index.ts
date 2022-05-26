import express from "express";
import { providers } from "ethers";
import { contractEventService } from "./listeners/old";
import { EvmEventService } from "./listeners/evm";
import { elrondEventListener } from "./listeners/elrond";
import { tezosEventListener } from "./listeners/tezos";
import { AlgorandEventListener } from "./listeners/algorand";
import config from "./config";
import { MikroORM, wrap } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import { explorerDB, indexerDb } from "./mikro-orm.config";
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import createNFTRepo from "./db/indexerRepo";
import IndexUpdater from "./services/indexUpdater"
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
import moment, { Moment } from "moment";
import { IEvent, BridgeEvent } from "./entities/IEvent";
import { DailyData, IDailyData } from "./entities/IDailyData";

const cron = require("node-cron");

export let io: Server;

export default (async function main() {

  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  const orm = await MikroORM.init(explorerDB);

  const indexerOrm = await MikroORM.init(indexerDb);
  const txRoutes = txRouter(createEventRepo(orm));
  new IndexUpdater(createNFTRepo(indexerOrm))
  app.use("/", txRoutes);
     
  contractEventService(4, createEventRepo(orm), 4)

  EvmEventService(createEventRepo(orm)).listen();

  // elrondEventListener(
  //   createEventRepo(orm)
  // ).listen();


  // tezosEventListener(
  //   config.tezos.socket,
  //   config.tezos.contract,
  //   config.tezos.name,
  //   config.tezos.nonce,
  //   config.tezos.id,
  //   createEventRepo(orm)
  // ).listen();

  // AlgorandEventListener(createEventRepo(orm)).listen();



  const server = http.createServer(app);

  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
  });

  server.listen(config.port, async () => {
    console.log(`Listening on port ${process.env.PORT}`);
    const repo = createEventRepo(orm);
    repo.saveDailyData();
    cron.schedule("*/30 * * * *", () => repo.saveDailyData());
  });

  return { server, socket: io, app, eventRepo: createEventRepo(orm) };
})();
