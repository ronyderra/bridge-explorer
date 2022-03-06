import dotenv from "dotenv";

dotenv.config();

function getOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key}`);
  }
  return value;
}

const config = {
  web3: [
    // {
    //   name: "AURORA",
    //   node: getOrThrow("AURORA_RPC_URL"),
    //   contract: getOrThrow("AURORA_MINTER_ADDRESS"),
    //   nonce: getOrThrow("AURORA_NONCE"),
    // },
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
    // {
    //   name: "VELAS",
    //   node: getOrThrow("VELAS_RPC_URL"),
    //   contract: getOrThrow("VELAS_MINTER_ADDRESS"),
    //   nonce: getOrThrow("VELAS_NONCE"),
    // },
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
    // {
    //   name: "IOTEX",
    //   node: getOrThrow("IOTEX_RPC_URL"),
    //   contract: getOrThrow("IOTEX_MINTER_ADDRESS"),
    //   nonce: getOrThrow("IOTEX_NONCE"),
    // },
    // {
    //   name: "FANTOM",
    //   node: getOrThrow("FANTOM_RPC_URL"),
    //   contract: getOrThrow("FANTOM_MINTER_ADDRESS"),
    //   nonce: getOrThrow("FANTOM_NONCE"),
    // },
    // {
    //   name: "CELO",
    //   node: getOrThrow("CELO_RPC_URL"),
    //   contract: getOrThrow("CELO_MINTER_ADDRESS"),
    //   nonce: getOrThrow("CELO_NONCE")
    // },
    {
      name: "HARMONY",
      node: getOrThrow("HARMONY_RPC_URL"),
      contract: getOrThrow("HARMONY_MINTER_ADDRESS"),
      nonce: getOrThrow("HARMONY_NONCE"),
    },
    // {
    //   name: "GNOSIS",
    //   node: getOrThrow("GNOSIS_RPC_URL"),
    //   contract: getOrThrow("GNOSIS_MINTER_ADDRESS"),
    //   nonce: getOrThrow("GNOSIS_NONCE"),
    // },
    // {
    //    name: "FUSE",
    //    node: getOrThrow("FUSE_RPC_URL"),
    //    contract: getOrThrow("FUSE_MINTER_ADDRESS"),
    //    nonce: getOrThrow("FUSE_NONCE"),
    //  },
    // {
    //   name: "UNIQUE",
    //   node: getOrThrow("UNIQUE_RPC_URL"),
    //   contract: getOrThrow("UNIQUE_MINTER_ADDRESS"),
    //   nonce: getOrThrow("UNIQUE_NONCE"),
    // },
  ],
  // elrond: {
  //   name: "ELROND",
  //   node: getOrThrow("ELROND_RPC_URL"),
  //   contract: getOrThrow("ELROND_MINTER_ADDRESS"),
  //   nonce: getOrThrow("ELROND_NONCE"),
  //   socket: getOrThrow("ELROND_SOCKET_URL"),
  // },
  db: getOrThrow("DB_URL"),
  port: getOrThrow("PORT"),
  socketUrl: getOrThrow("SOCKET_URL"),
};

export function chainNonceToName(nonce: string) {
  const chain = config.web3.find((chain) => chain.nonce === nonce);

  return chain
    ? chain.name
    : // : config.elrond.nonce === nonce
      // ? config.elrond.name
      "UNKNOWN";
}

console.log(chainNonceToName("4"));

export default config;
