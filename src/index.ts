import express from "express";
import { providers } from "ethers";
import { contractEventService } from "./listeners/old";
import { EvmEventService } from "./listeners/evm";
import { elrondEventListener } from "./listeners/elrond";
import { tezosEventListener } from "./listeners/tezos";
import { AlgorandEventListener } from "./listeners/algorand";
import { TronEventListener } from "./listeners/tron";
import config from "./config";
import { MikroORM, wrap } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import { explorerDB, indexerDb } from "./mikro-orm.config";
import http from "http";
import bodyParser from "body-parser";
import cron from "node-cron";
import createNFTRepo from "./db/indexerRepo";
import IndexUpdater from "./services/indexUpdater";
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
import moment, { Moment } from "moment";
import { IEvent, BridgeEvent } from "./entities/IEvent";
import { DailyData, IDailyData } from "./entities/IDailyData";
import { Server } from "socket.io";

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
  console.log("a user connected ", socket.id);
});

server.listen(config.port, async () => {
  console.log(`Listening on port ${process.env.PORT}`);

  const orm = await MikroORM.init(explorerDB);

  const indexerOrm = await MikroORM.init(indexerDb);
  const txRoutes = txRouter(createEventRepo(orm));
  new IndexUpdater(createNFTRepo(indexerOrm));
  app.use("/", txRoutes);

  listen && EvmEventService(createEventRepo(orm)).listenBridge(); //listen bridge notifier

  listen &&
    config.web3.map((chain) =>
      EvmEventService(createEventRepo(orm)).listenNative(chain)
    ); // listen all evm chain native events

  listen && elrondEventListener(createEventRepo(orm)).listen();

  listen &&
    tezosEventListener(
      config.tezos.socket,
      config.tezos.contract,
      config.tezos.name,
      config.tezos.nonce,
      config.tezos.id,
      createEventRepo(orm)
    ).listen();

  listen && AlgorandEventListener(createEventRepo(orm)).listen();

  listen && TronEventListener(createEventRepo(orm)).listen();

  const repo = createEventRepo(orm);
  repo.saveDailyData();
  cron.schedule("*/30 * * * *", () => repo.saveDailyData());
});
