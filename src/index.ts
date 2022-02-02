import express from "express";
import { ethers, providers } from "ethers";
import { contractEventService } from "./listeners/web3";
import config from "./config";
import { PrismaClient } from "@prisma/client";
import createEventRepo from "./db/repo";
const prisma = new PrismaClient();

const app = express();

async function main() {
  config.web3.map((chain) => {
    return contractEventService(
      new providers.JsonRpcProvider(chain.node),
      chain.contract,
      chain.name,
      chain.nonce,
      createEventRepo(prisma)
    ).listen();
  });
}

main();

app.get("/", async (req, res) => {
  const events = await prisma.event.findMany();
  res.json(events);
});

app.post("/tx_event", async (req, res) => {
  const { chain_nonce, action_id, tx_hash } = req.body;
  await createEventRepo(prisma).updateEvent(action_id, chain_nonce, tx_hash);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
