import express from "express";
import { providers } from "ethers";
import { contractEventService } from "./listeners/web3";
import { BridgeEventService } from "./listeners/bridge";
import { elrondEventListener } from "./listeners/elrond";
import { tezosEventListener } from "./listeners/tezos";
import { AlgorandEventListener } from "./listeners/algorand";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import {explorerDB, indexerDb} from "./mikro-orm.config";
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import createNFTRepo from "./db/indexerRepo";
import IndexUpdater from "./services/indexUpdater"

const cron = require("node-cron");

export let io: Server;

export default (async function main() {


  
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  const orm = await MikroORM.init(explorerDB);

  AlgorandEventListener(createEventRepo(orm)).listen();
  //const indexerOrm = await MikroORM.init(indexerDb);
  //const txRoutes = txRouter(createEventRepo(orm));

  //new IndexUpdater(createNFTRepo(indexerOrm))


  //app.use("/", txRoutes);

<<<<<<< HEAD
  config.web3.map((chain) => {
    return contractEventService(
      new providers.JsonRpcProvider(chain.node),
      chain.contract,
      chain.name,
      chain.nonce,
      createEventRepo(orm),
      axios
    ).listen();
  });
  EventService(createEventRepo(orm)).listen();

  // elrondEventListener(
  //   config.elrond.node,
  //   config.elrond.contract,
  //   config.elrond.name,
  //   config.elrond.nonce,
  //   createEventRepo(orm)
  // ).listen();

  // const elrondSocket = elrondIo(config.elrond.socket);
=======


  //BridgeEventService(createEventRepo(orm)).listen();

  false && elrondEventListener(
    config.elrond.node,
    config.elrond.contract, 
    config.elrond.name,
    config.elrond.nonce,
    createEventRepo(orm)
  ).listen();

  false && tezosEventListener(
    config.tezos.socket,
    config.tezos.contract,
    config.tezos.name,
    config.tezos.nonce,
    config.tezos.id,
    createEventRepo(orm)
  ).listen();


>>>>>>> main

  const server = http.createServer(app);

  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
  });
<<<<<<< HEAD
  // elrondSocket.on(
  //   "elrond:bridge_tx",
  //   async (
  //     fromHash: string,
  //     sender: string,
  //     uris: string[],
  //     actionId: string
  //   ) => {
  //     try {
  //       console.log("dsds");
  //       const updated = await createEventRepo(orm).updateElrond(
  //         actionId,
  //         config.elrond.nonce,
  //         fromHash,
  //         sender,
  //         uris[0]
  //       );

  //       console.log(updated, "updated");

  //       io.emit("updateEvent", updated);
  //     } catch (e: any) {
  //       console.error(e);
  //     }
  //   }
  // );

  server.listen(config.port, () => {
=======

  server.listen(config.port, async () => {
>>>>>>> main
    console.log(`Listening on port ${process.env.PORT}`);
    const repo = createEventRepo(orm);
    //repo.saveDailyData();
    //cron.schedule("*/30 * * * *", () => repo.saveDailyData());
  });

  return { server, socket: io, app, eventRepo: createEventRepo(orm) };
})();
