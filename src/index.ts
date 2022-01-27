import express from "express";
import { ethers } from "ethers";
import {
  contractTransferEventService,
  contractUnfreezeEventService,
} from "./service";
import config from "./config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const app = express();

async function main() {
  const velasProvider = new ethers.providers.JsonRpcProvider(config.velas.node);
  const bscProvider = new ethers.providers.JsonRpcProvider(config.bsc.node);
  const ethProvider = new ethers.providers.JsonRpcProvider(config.eth.node);
  const polygonProvider = new ethers.providers.JsonRpcProvider(
    config.polygon.node
  );
  const avalancheProvider = new ethers.providers.JsonRpcProvider(
    config.avalanche.node
  );
  const fantomProvider = new ethers.providers.JsonRpcProvider(
    config.fantom.node
  );
  const celoProvider = new ethers.providers.JsonRpcProvider(config.celo.node);
  const harmonyProvider = new ethers.providers.JsonRpcProvider(
    config.harmony.node
  );
  const xdaiProvider = new ethers.providers.JsonRpcProvider(config.xdai.node);
  const fuseProvider = new ethers.providers.JsonRpcProvider(config.fuse.node);
  const uniqueProvider = new ethers.providers.JsonRpcProvider(
    config.unique.node
  );

  contractTransferEventService(
    velasProvider,
    config.velas.contract,
    "VELAS",
    config.velas.nonce
  ).listen();
  contractUnfreezeEventService(
    velasProvider,
    config.velas.contract,
    "VELAS",
    config.velas.nonce
  ).listen();

  contractTransferEventService(
    bscProvider,
    config.bsc.contract,
    "BSC",
    config.bsc.nonce
  ).listen();
  contractUnfreezeEventService(
    bscProvider,
    config.bsc.contract,
    "BSC",
    config.bsc.nonce
  ).listen();

  contractTransferEventService(
    ethProvider,
    config.eth.contract,
    "ETHEREUM",
    config.eth.nonce
  ).listen();
  contractUnfreezeEventService(
    ethProvider,
    config.eth.contract,
    "ETHEREUM",
    config.eth.nonce
  ).listen();

  contractTransferEventService(
    polygonProvider,
    config.polygon.contract,
    "polygon",
    config.polygon.nonce
  ).listen();
  contractUnfreezeEventService(
    polygonProvider,
    config.polygon.contract,
    "polygon",
    config.polygon.nonce
  ).listen();

  contractTransferEventService(
    avalancheProvider,
    config.avalanche.contract,
    "AVALANCHE",
    config.avalanche.nonce
  ).listen();
  contractUnfreezeEventService(
    avalancheProvider,
    config.avalanche.contract,
    "AVALANCHE",
    config.avalanche.nonce
  ).listen();

  contractTransferEventService(
    fantomProvider,
    config.fantom.contract,
    "FANTOM",
    config.fantom.nonce
  ).listen();
  contractUnfreezeEventService(
    fantomProvider,
    config.fantom.contract,
    "FANTOM",
    config.fantom.nonce
  ).listen();

  contractTransferEventService(
    celoProvider,
    config.celo.contract,
    "CELO",
    config.celo.nonce
  ).listen();
  contractUnfreezeEventService(
    celoProvider,
    config.celo.contract,
    "CELO",
    config.celo.nonce
  ).listen();

  contractTransferEventService(
    harmonyProvider,
    config.harmony.contract,
    "HARMONY",
    config.harmony.nonce
  ).listen();
  contractUnfreezeEventService(
    harmonyProvider,
    config.harmony.contract,
    "HARMONY",
    config.harmony.nonce
  ).listen();

  contractTransferEventService(
    xdaiProvider,
    config.xdai.contract,
    "XDAI",
    config.xdai.nonce
  ).listen();
  contractUnfreezeEventService(
    xdaiProvider,
    config.xdai.contract,
    "XDAI",
    config.xdai.nonce
  ).listen();

  contractTransferEventService(
    fuseProvider,
    config.fuse.contract,
    "FUSE",
    config.fuse.nonce
  ).listen();
  contractUnfreezeEventService(
    fuseProvider,
    config.fuse.contract,
    "FUSE",
    config.fuse.nonce
  ).listen();

  contractTransferEventService(
    uniqueProvider,
    config.unique.contract,
    "UNIQUE",
    config.unique.nonce
  ).listen();
  contractUnfreezeEventService(
    uniqueProvider,
    config.unique.contract,
    "UNIQUE",
    config.unique.nonce
  ).listen();
}

main();

app.get("/", async (req, res) => {
  const events = await prisma.event.findMany();
  res.json(events);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
