import express from "express";
import { EvmEventService } from "./listeners/Evm/evm";
import { elrondEventListener } from "./listeners/Elrond/elrond";
import { tezosEventListener } from "./listeners/Tezos/tezos";
import { AlgorandEventListener } from "./listeners/Algorand/algorand";
import { TronEventListener } from "./listeners/Tron/tron";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./business-logic/repo";
import { txRouter } from "./controller/tx";
import { explorerDB, indexerDb } from "./mikro-orm.config";
import http from "http";
import bodyParser from "body-parser";
import cron from "node-cron";
import createNFTRepo from "./business-logic/indexerRepo";
import IndexUpdater from "./services/indexUpdater";
import { Server } from "socket.io";
import { scrap } from './scraper/scrap'

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

const listen = true;

export const server = http.createServer(app);

export const clientAppSocket = new Server(server, {
  cors: {
    origin: "*",
  },
});

clientAppSocket.on("connection", (socket) => {
  console.log("a user connected to ", socket.id);
});

export default server.listen(config.port, async () => {
  console.log(`Listening on port ${process.env.PORT}`);

  const orm = await MikroORM.init(explorerDB);

  const indexerOrm = await MikroORM.init(indexerDb);
  const txRoutes = txRouter(orm.em);
  new IndexUpdater(createNFTRepo(indexerOrm));
  app.use("/", txRoutes);

  listen && EvmEventService(orm.em.fork()).listenBridge(); //listen bridge notifier

  listen && config.web3.map((chain, i) => setTimeout(() => scrap(orm.em.fork(), chain.nonce), 10000 + (i + 1) * .5 * 1000));

  listen && elrondEventListener(orm.em.fork()).listen();

  listen && tezosEventListener(
          config.tezos.socket,
          config.tezos.contract,
          config.tezos.name,
          config.tezos.nonce,
          config.tezos.id,
          orm.em.fork()
          ).listen();

  listen && AlgorandEventListener(orm.em.fork()).listen();
  
  listen && TronEventListener(orm.em.fork()).listen();

  const repo = createEventRepo(orm.em.fork());
  repo.saveDailyData();
  cron.schedule("*/4 * * * *", () => repo.saveDailyData());
});
