import express from "express";
import { providers } from "ethers";
import { contractEventService } from "./listeners/web3";
import config from "./config";
import { MikroORM } from "@mikro-orm/core";
import cors from "cors";
import createEventRepo from "./db/repo";
import { txRouter } from "./routes/tx";
import DBConf from "./mikro-orm.config";

(async function main() {
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
      createEventRepo(orm)
    ).listen();
  });

  app.listen(config.port, () =>
    console.log(`Listening on port ${process.env.PORT}`)
  );
})();
