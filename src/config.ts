import { config } from "dotenv";

config();

function getOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key}`);
  }
  return value;
}

export default {
  web3: [
    {
      name: "BSC",
      node: getOrThrow("BSC_RPC_URL"),
      contract: getOrThrow("BSC_MINTER_ADDRESS"),
      nonce: getOrThrow("BSC_NONCE"),
    },
    // {
    //   name: "ETHEREUM",

    //   node: getOrThrow("ETHEREUM_RPC_URL"),
    //   contract: getOrThrow("ETHEREUM_MINTER_ADDRESS"),
    //   nonce: getOrThrow("ETHEREUM_NONCE"),
    // },
    {
      name: "VELAS",
      node: getOrThrow("VELAS_RPC_URL"),
      contract: getOrThrow("VELAS_MINTER_ADDRESS"),
      nonce: getOrThrow("VELAS_NONCE"),
    },
    {
      name: "POLYGON",

      node: getOrThrow("POLYGON_RPC_URL"),
      contract: getOrThrow("POLYGON_MINTER_ADDRESS"),
      nonce: getOrThrow("POLYGON_NONCE"),
    },
    {
      name: "AVALANCHE",
      node: getOrThrow("AVALANCHE_RPC_URL"),
      contract: getOrThrow("AVALANCHE_MINTER_ADDRESS"),
      nonce: getOrThrow("AVALANCHE_NONCE"),
    },
    {
      name: "FANTOM",
      node: getOrThrow("FANTOM_RPC_URL"),
      contract: getOrThrow("FANTOM_MINTER_ADDRESS"),
      nonce: getOrThrow("FANTOM_NONCE"),
    },
    // {
    //   name: "CELO",
    //   node: getOrThrow("CELO_RPC_URL"),
    //   contract: getOrThrow("CELO_MINTER_ADDRESS"),
    //   nonce: getOrThrow("CELO_NONCE")
    // },
    // {
    //   name: "HARMONY",
    //   node: getOrThrow("HARMONY_RPC_URL"),
    //   contract: getOrThrow("HARMONY_MINTER_ADDRESS"),
    //   nonce: getOrThrow("HARMONY_NONCE")
    // },
    {
      name: "XDAI",
      node: getOrThrow("XDAI_RPC_URL"),
      contract: getOrThrow("XDAI_MINTER_ADDRESS"),
      nonce: getOrThrow("XDAI_NONCE"),
    },
    {
      name: "FUSE",
      node: getOrThrow("FUSE_RPC_URL"),
      contract: getOrThrow("FUSE_MINTER_ADDRESS"),
      nonce: getOrThrow("FUSE_NONCE"),
    },
    // {
    //   name: "UNIQUE",
    //   node: getOrThrow("UNIQUE_RPC_URL"),
    //   contract: getOrThrow("UNIQUE_MINTER_ADDRESS"),
    //   nonce: getOrThrow("UNIQUE_NONCE"),
    // },
  ],
  elrond: {
    node: getOrThrow("ELROND_RPC_URL"),
    contract: getOrThrow("ELROND_MINTER_ADDRESS"),
  },
  db: getOrThrow("DB_URL"),
  port: getOrThrow("PORT"),
};
