import express from "express";
import { ethers, providers, BigNumber as EthBN } from "ethers";
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

  const provider = new providers.JsonRpcProvider('https://speedy-nodes-nyc.moralis.io/3749d19c2c6dbb6264f47871/polygon/mumbai/archive')

  //const contract = Minter__factory.connect('0x224f78681099d66ceedf4e52ee62e5a98ccb4b9e', provider);

  //const res = await provider.getTransaction('0xbcd346c34b93111d9ae7766981f155bb6ed880425bef0fdceae51eecdc73c663');

  //console.log(ethers.utils.defaultAbiCoder.decode(["tuple(uint256 networkId, address targetContract, uint256 actionId, address to, uint256 nftId, address mintWith)"], res.data));

  console.log(new BigNumber('0x1d5cd4fe0000000000000000000000000000000000000000627ff87e2ff454ed').toString());

  //contract.interface.decodeFunctionResult()


  //const a = ethers.utils.defaultAbiCoder.decode(["tuple(uint256 networkId, address targetContract, uint256 actionId, address to, uint256 nftId, address mintWith)"], ethers.utils.hexDataSlice('0x00000000000000000000000000000000000000000000000000216eed5e2e37c30000000000000000000000000000000000000000000000000f4d222fd7fbceec0000000000000000000000000000000000000000000001ffd65e43cf55e307850000000000000000000000000000000000000000000000000f2bb34279cd97290000000000000000000000000000000000000000000001ffd67fb2bcb4113f48', 4));




  //console.log(new BigNumber('0x6c4e'));

  /* setInterval(async () => {
     const num = await provider.getBlockNumber();
     const trxs = (await provider.getBlockWithTransactions(num)).transactions
     const ofContract = trxs.filter(trx => trx.to?.toLowerCase() === '0x224f78681099d66ceedf4e52ee62e5a98ccb4b9e'.toLowerCase());
     console.log(ofContract.length);
     if (ofContract.length) {
       for (const trx of ofContract) {
         const completed = await trx.wait();
 
 
         console.log(completed.logs.map(log => log.data));
         console.log(completed.logs.map(log => log.topics), 'completed');
       }
     }
   }, 5000)*/


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
    repo.saveDailyData();
    //cron.schedule("*/30 * * * *", () => repo.saveDailyData());
  });

  return { server, socket: io, app, eventRepo: createEventRepo(orm) };
})();
