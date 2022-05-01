import express from "express";
import { providers } from "ethers";
import { contractEventService } from "./listeners/web3";
import { BridgeEventService } from "./listeners/bridge";
import { elrondEventListener } from "./listeners/elrond";
import { tezosEventListener } from "./listeners/tezos";
import { AlgorandEventListener } from "./listeners/algorand";
import config, { getNounces } from "./config";
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
import os from 'os'
import { fork ,ChildProcess,} from "child_process"
import path from 'path'

const cron = require("node-cron");

export let io: Server;

export default (async function main() {



  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  const childs:ChildProcess[] = []
  const childsMap = new Map<ChildProcess, string[]>();
  const chains = getNounces();
  console.log(chains.length, ' chains');
  console.log(path.resolve(__dirname, "../build/child"));
  
  for (let i = 0; i < os.cpus().length - 4; i++) {
    const child = fork(path.resolve(__dirname, "child"), []);
    childs.push(child)

    child.on("close", function (code) {
      console.log("child process exited with code " + code);
    });
  }

  




 let childIdx = 0;
  for (const chainNonce of chains) {
    if (childIdx === childs.length) childIdx = 0;
    const child = childsMap.get(childs[childIdx]);
   
    child? childsMap.set(childs[childIdx], [...child, chainNonce]): childsMap.set(childs[childIdx], [chainNonce]);

    childIdx++;
  }

  childsMap.forEach((value, key, map) => {
    key.send(value);
  })
  
  //[JSON.stringify({ listenForChains: ['1', '2'] })]

  const orm = await MikroORM.init(explorerDB);


  //BridgeEventService(createEventRepo(orm)).listen();


  //AlgorandEventListener(createEventRepo(orm)).listen();


  //const indexerOrm = await MikroORM.init(indexerDb);
  //const txRoutes = txRouter(createEventRepo(orm));

  //new IndexUpdater(createNFTRepo(indexerOrm))


  //app.use("/", txRoutes);





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
    //repo.saveDailyData();
    //cron.schedule("*/30 * * * *", () => repo.saveDailyData());
  });

  return { server, socket: io, app, eventRepo: createEventRepo(orm) };
})();
