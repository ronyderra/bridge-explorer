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
  bsc: {
    node: getOrThrow("BSC_RPC_URL"),
    contract: getOrThrow("BSC_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("BSC_NONCE")),
  },
  eth: {
    node: getOrThrow("ETHEREUM_RPC_URL"),
    contract: getOrThrow("ETHEREUM_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("ETHEREUM_NONCE")),
  },
  velas: {
    node: getOrThrow("VELAS_RPC_URL"),
    contract: getOrThrow("VELAS_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("VELAS_NONCE")),
  },
  polygon: {
    node: getOrThrow("POLYGON_RPC_URL"),
    contract: getOrThrow("POLYGON_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("POLYGON_NONCE")),
  },
  avalanche: {
    node: getOrThrow("AVALANCHE_RPC_URL"),
    contract: getOrThrow("AVALANCHE_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("AVALANCHE_NONCE")),
  },
  fantom: {
    node: getOrThrow("FANTOM_RPC_URL"),
    contract: getOrThrow("FANTOM_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("FANTOM_NONCE")),
  },
  celo: {
    node: getOrThrow("CELO_RPC_URL"),
    contract: getOrThrow("CELO_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("CELO_NONCE")),
  },
  harmony: {
    node: getOrThrow("HARMONY_RPC_URL"),
    contract: getOrThrow("HARMONY_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("HARMONY_NONCE")),
  },
  xdai: {
    node: getOrThrow("XDAI_RPC_URL"),
    contract: getOrThrow("XDAI_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("XDAI_NONCE")),
  },
  fuse: {
    node: getOrThrow("FUSE_RPC_URL"),
    contract: getOrThrow("FUSE_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("FUSE_NONCE")),
  },
  unique: {
    node: getOrThrow("UNIQUE_RPC_URL"),
    contract: getOrThrow("UNIQUE_CONTRACT_ADDRESS"),
    nonce: parseInt(getOrThrow("UNIQUE_NONCE")),
  },
};
