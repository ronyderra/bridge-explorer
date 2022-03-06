import express from "express";
import { providers } from "ethers";
import { contractEventService, EventService } from "./listeners/web3";
import { elrondEventListener } from "./listeners/elrond";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import DBConf from "./mikro-orm.config";
import axios from "axios";
import http from "http";
import { Server } from "socket.io";
import { io as elrondIo } from "socket.io-client";

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

  elrondEventListener(
    config.elrond.node,
    config.elrond.contract,
    config.elrond.name,
    config.elrond.nonce,
    createEventRepo(orm)
  ).listen();

  const elrondSocket = elrondIo(config.elrond.socket);

  const server = http.createServer(app);

  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
  });
  elrondSocket.on(
    "elrond:bridge_tx",
    async (
      fromHash: string,
      sender: string,
      uris: string[],
      actionId: string
    ) => {
      try {
        console.log("dsds");
        const updated = await createEventRepo(orm).updateElrond(
          actionId,
          config.elrond.nonce,
          fromHash,
          sender,
          uris[0]
        );

        console.log(updated, "updated");

        io.emit("updateEvent", updated);
      } catch (e: any) {
        console.error(e);
      }
    }
  );

  server.listen(config.port, () => {
    console.log(`Listening on port ${process.env.PORT}`);
  });

  return { server, socket: io, app, eventRepo: createEventRepo(orm) };
})();
