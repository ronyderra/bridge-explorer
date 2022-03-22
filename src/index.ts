import express from "express";
import { providers } from "ethers";
import { contractEventService, EventService } from "./listeners/web3";
import { elrondEventListener ,elrondBridgeListener } from "./listeners/elrond";
import {tezosEventListener} from "./listeners/tezos";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import DBConf from "./mikro-orm.config";
import axios from "axios";
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";


const cron = require("node-cron");

export let io: Server;

export default (async function main() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  const orm = await MikroORM.init(DBConf);
  const txRoutes = txRouter(createEventRepo(orm));

  app.use("/", txRoutes);



  config.web3.map((chain) => {
   
    return contractEventService(
      new providers.JsonRpcProvider(chain.node),
      chain.contract,
      chain.name,
      chain.nonce,
      chain.id,
      createEventRepo(orm),
      axios
    ).listen();
  });
  
  EventService(createEventRepo(orm)).listen();

  elrondEventListener(
    config.elrond.node,
    config.elrond.contract,
    config.elrond.name,
    config.elrond.nonce,
    createEventRepo(orm)
  ).listen();

  elrondBridgeListener(orm)

  tezosEventListener(config.tezos.socket, config.tezos.contract, config.tezos.name, config.tezos.nonce, createEventRepo(orm)).listen();


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
  })

  return { server, socket: io, app, eventRepo: createEventRepo(orm) };
})();
