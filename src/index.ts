import express from "express";
import { ethers, providers, BigNumber as EthBN } from "ethers";
import { nativeEvmListener } from "./listeners/web3";
import { BridgeEventService } from "./listeners/bridge";
import { elrondEventListener } from "./listeners/elrond";
import { tezosEventListener } from "./listeners/tezos";
import { AlgorandEventListener } from "./listeners/algorand";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import { explorerDB, indexerDb } from "./mikro-orm.config";
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import createNFTRepo from "./db/indexerRepo";
import IndexUpdater from "./services/indexUpdater"
import { Minter__factory } from "xpnet-web3-contracts";
import BigNumber from "bignumber.js";
const abi = require('./drift.js')


const cron = require("node-cron");

export let io: Server;

export default (async function main() {



  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  const orm = await MikroORM.init(explorerDB);

  AlgorandEventListener(createEventRepo(orm)).listen();
  const indexerOrm = await MikroORM.init(indexerDb);
  const txRoutes = txRouter(createEventRepo(orm));

  const a = new IndexUpdater(createNFTRepo(indexerOrm))
  //ds

  console.log(EthBN.from('0x69b8').toString());

  app.use("/", txRoutes);



  BridgeEventService(createEventRepo(orm)).listen();






  nativeEvmListener(
    config.web3.find(c => c.nonce === '4')!,
    createEventRepo(orm)
   ).listen()

   nativeEvmListener(
    config.web3.find(c => c.nonce === '7')!,
    createEventRepo(orm)
   ).listen()



  /*false && elrondEventListener(
    createEventRepo(orm)
  ).listen();*/

  false && tezosEventListener(
    config.tezos.socket,
    config.tezos.contract,
    config.tezos.name,
    config.tezos.nonce,
    config.tezos.id,
    createEventRepo(orm)
  ).listen();



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
    //cron.schedule("*/30 * * * *", () => repo.saveDailyData());
  });

  return { server, socket: io, app, eventRepo: createEventRepo(orm) };
})();
