import express from "express";
import { providers } from "ethers";
import { contractEventService } from "./listeners/web3";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import DBConf from "./mikro-orm.config";
import axios from "axios";
import http from "http";
import { Server } from "socket.io";

(async function main() {
  const app = express();
  app.use(cors());

  const orm = await MikroORM.init(DBConf);

  const txRoutes = txRouter(createEventRepo(orm));

  let io: any = null;

  app.use(
    "/",
    (req: any, res, next) => {
      req.io = io;
      next();
    },
    txRoutes
  );

  false &&
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

  const server = http.createServer(app);

  server.listen(config.port, () => {
    console.log(`Listening on port ${process.env.PORT}`);

    io = new Server(server);
  });
})();
