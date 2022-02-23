import express from "express";
import { providers } from "ethers";
import { contractEventService, EventService } from "./listeners/web3";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import DBConf from "./mikro-orm.config";
import axios from "axios";
import http from "http";
import { Server } from "socket.io";

export let io: Server;

export default (async function main() {
  const app = express();
  app.use(cors());

  const orm = await MikroORM.init(DBConf);
  const txRoutes = txRouter(createEventRepo(orm));

  app.use("/", txRoutes);

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

  const server = http.createServer(app);

  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
  });

  server.listen(config.port, () => {
    console.log(`Listening on port ${process.env.PORT}`);
  });

  return { server, socket: io, app };
})();
