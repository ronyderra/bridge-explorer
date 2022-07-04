import dotenv from "dotenv";
import {BridgeEvent} from './Intrerfaces/IEvent'
dotenv.config();

export const currency: any = {
  "4": "BNB",
  "19": "VLX",
  "14": "XDAI",
  "2": "EGLD",
  "20": "IOTX",
  "16": "FUSE",
  "6": "AVAX",
  "21": "AETH",
  "7": "MATIC",
  "5": "ETH",
  "8": "FTM",
  "12": "ONE",
  "18": "XTZ",
  "23": "GT",
  "25": "VET",
  "9": "TRX",
  "15": "ALGO"
};

export const EVM_VALIDATORS = [
  "0xffa74a26bf87a32992bb4be080467bb4a8019e00",
  "0x837b2eb764860b442c971f98f505e7c5f419edd7",
  "0x9671ce5a02eb53cf0f2cbd220b34e50c39c0bf23",
  "0x90e79cc7a06dbd227569920a8c4a625f630d77f4",
  "0xdc80905cafeda39cb19a566baeef52472848e82f",
  "0x77745cd585798e55938940e3d4dd0fd7cde7bdd6",
  "0xc2a29b4e9fa71e9033a52611544403241c56ac5e",
]

export const txExplorers: any = {
  "4": "https://bscscan.com/tx/",
  "19": "https://explorer.velas.com/tx/",
  "14": "https://blockscout.com/xdai/mainnet/tx/",
  "2": "https://explorer.elrond.com/transactions/",
  "20": "https://iotexscan.io/tx/",
  "6": "https://snowtrace.io/tx/",
  "16": "https://explorer.fuse.io/tx/",
  "21": "https://explorer.mainnet.aurora.dev/tx/",
  "7": "https://polygonscan.com/tx/",
  "5": "https://etherscan.io/tx/",
  "8": "https://ftmscan.com/tx/",
  "12": "https://explorer.harmony.one/tx/",
  "18": "https://tezblock.io/transaction/",
  "23": "https://gatescan.org/tx/",
  "25": "https://explore.vechain.org/transactions/",
};

export const addressExplorers: any = {
  "4": "https://bscscan.com//address/",
  "19": "https://explorer.velas.com/address/",
  "14": "https://blockscout.com/xdai/mainnet/address/",
  "2": "https://explorer.elrond.com/accounts/",
  "20": "https://iotexscan.io/address/",
  "6": "https://snowtrace.io/address/",
  "16": "https://explorer.fuse.io/address/",
  "21": "https://explorer.mainnet.aurora.dev/address/",
  "7": "https://polygonscan.com/address/",
  "5": "https://etherscan.io/address/",
  "8": "https://ftmscan.com/address/",
  "12": "https://explorer.harmony.one/address/",
  "18": "https://tezblock.io/account/",
  "23": "https://gatescan.org/address/",
  "25": "https://explore.vechain.org/accounts/",
};

function getOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key}`);
  }
  return value;
}

export interface ChainConfig {
  name: string;
  node: string;
  contract: string;
  nonce: string;
  id: string;
  actionIdOffset?: number;
}

interface Config {
  web3: ChainConfig[];
  elrond: ChainConfig & { socket: string; api:string };
  tezos: ChainConfig & { socket: string; xpnft: string };
  algorand: ChainConfig & { indexerNode: string; apiKey: string };
  tron: ChainConfig & { apiKey: string };
  [key: string]: any;
}

const config: Config = {
  web3: [
    {
      name: "AURORA",
      node: getOrThrow("AURORA_RPC_URL"),
      contract: getOrThrow("AURORA_MINTER_ADDRESS"),
      nonce: getOrThrow("AURORA_NONCE"),
      id: "aurora-near",
    },
    {
      name: "BSC",
      node: getOrThrow("BSC_RPC_URL"),
      contract: getOrThrow("BSC_MINTER_ADDRESS"),
      nonce: getOrThrow("BSC_NONCE"),
      id: "binancecoin",
    },
    {
      name: "ETHEREUM",
      node: getOrThrow("ETHEREUM_RPC_URL"),
      contract: getOrThrow("ETHEREUM_MINTER_ADDRESS"),
      nonce: getOrThrow("ETHEREUM_NONCE"),
      id: "ethereum",
    },
    {
      name: "VELAS",
      node: getOrThrow("VELAS_RPC_URL"),
      contract: getOrThrow("VELAS_MINTER_ADDRESS"),
      nonce: getOrThrow("VELAS_NONCE"),
      id: "velas",
    },
    {
      name: "POLYGON",
      node: getOrThrow("POLYGON_RPC_URL"),
      contract: getOrThrow("POLYGON_MINTER_ADDRESS"),
      nonce: getOrThrow("POLYGON_NONCE"),
      id: "matic-network",
    },
    {
      name: "AVALANCHE",
      node: getOrThrow("AVALANCHE_RPC_URL"),
      contract: getOrThrow("AVALANCHE_MINTER_ADDRESS"),
      nonce: getOrThrow("AVALANCHE_NONCE"),
      id: "avalanche-2",
    },
    {
      name: "IOTEX",
      node: getOrThrow("IOTEX_RPC_URL"),
      contract: getOrThrow("IOTEX_MINTER_ADDRESS"),
      nonce: getOrThrow("IOTEX_NONCE"),
      id: "iotex",
      actionIdOffset: 10,
    },
    {
      name: "FANTOM",
      node: getOrThrow("FANTOM_RPC_URL"),
      contract: getOrThrow("FANTOM_MINTER_ADDRESS"),
      nonce: getOrThrow("FANTOM_NONCE"),
      id: "fantom",
    },
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
      id: "harmony",
    },
    {
      name: "GNOSIS CHAIN",
      node: getOrThrow("GNOSIS_RPC_URL"),
      contract: getOrThrow("GNOSIS_MINTER_ADDRESS"),
      nonce: getOrThrow("GNOSIS_NONCE"),
      id: "gnosis",
    },
    {
      name: "FUSE",
      node: getOrThrow("FUSE_RPC_URL"),
      contract: getOrThrow("FUSE_MINTER_ADDRESS"),
      nonce: getOrThrow("FUSE_NONCE"),
      id: "fuse-network-token",
    },
    {
      name: "GATECHAIN",
      node: getOrThrow("GATECHAIN_RPC_URL"),
      contract: getOrThrow("GATECHAIN_MINTER_ADDRESS"),
      nonce: getOrThrow("GATECHAIN_NONCE"),
      id: "gatechain-wormhole",
    },
    {
      name: "VECHAIN",
      node: getOrThrow("VECHAIN_RPC_URL"),
      contract: getOrThrow("VECHAIN_MINTER_ADDRESS"),
      nonce: getOrThrow("VECHAIN_NONCE"),
      id: "vechain",
    },
  ],
  elrond: {
    name: "ELROND",
    node: getOrThrow("ELROND_RPC_URL"),
    contract: getOrThrow("ELROND_MINTER_ADDRESS"),
    api: getOrThrow("ELROND_API"),
    nonce: getOrThrow("ELROND_NONCE"),
    socket: getOrThrow("ELROND_SOCKET_URL"),
    id: "elrond-erd-2",
  },
  tezos: {
    name: "TEZOS",
    node: "",
    socket: getOrThrow("TEZOS_RPC_URL"),
    xpnft: getOrThrow("TEZOS_XPNFT_ADDRESS"),
    contract: getOrThrow("TEZOS_MINTER_ADDRESS"),
    nonce: getOrThrow("TEZOS_NONCE"),
    id: "tezos",
  },
  algorand: {
    name: "ALGORAND",
    node: getOrThrow("ALGORAND_NODE"),
    indexerNode: getOrThrow("ALGORAND_INDEXER"),
    apiKey: getOrThrow("ALGORAND_API_KEY"),
    //socket: getOrThrow("TEZOS_RPC_URL"),
    //xpnft: getOrThrow("TEZOS_XPNFT_ADDRESS"),
    contract: getOrThrow("ALGORAND_APPLICATION"),
    nonce: getOrThrow("ALGORAND_NONCE"),
    id: "algorand",
  },
  tron: {
    name: "TRON",
    node: getOrThrow("TRON_RPC_URL"),
    contract: getOrThrow("TRON_MINTER_ADDRESS"),
    nonce: getOrThrow("TRON_NONCE"),
    id: "tron",
    apiKey: getOrThrow("TRON_API_KEY"),
  },
  db: getOrThrow("DB_URL"),
  indexer_db: getOrThrow("XP_INDEXER_DB"),
  port: getOrThrow("PORT"),
  socketUrl: getOrThrow("SOCKET_URL"),
  type: getOrThrow("type_sheets"),
  project_id: getOrThrow("project_id_sheets"),
  private_key_id: getOrThrow("private_key_id_sheets"),
  private_key: getOrThrow("private_key_sheet"),
  client_email: getOrThrow("client_email_sheet"),
  client_id: getOrThrow("client_id_sheet"),
  auth_uri: getOrThrow("auth_uri_sheet"),
  token_uri: getOrThrow("token_uri_sheet"),
  auth_provider_x509_cert_url: getOrThrow("auth_provider_x509_cert_url"),
  client_x509_cert_url: getOrThrow("client_x509_cert_url"),
  mail_key: getOrThrow("SENDING_BLUE"),
  captcha_secret: getOrThrow("SECRET_CAPTCHA"),
  web3socketUrl: getOrThrow("WEB3_SOCKET_URL"),
  telegramBotToken:getOrThrow("TELEGRAM_BOT"),
  telChatId:getOrThrow("TELEGRAM_CHAT")
};

export function chainNonceToName(nonce: string) {
  return getChain(nonce)?.name || "UNKNOWN";
}

export const chainNonceToId = (nonce: string) => {
  return getChain(nonce)?.id || "";
};

export const getChain = (nonce: string) => {
  try {
    Object.keys(config).forEach((key: string) => {
      const item: ChainConfig | ChainConfig[] = config[key];

      if (Array.isArray(item)) {
        for (const c of item) {
          if (c.nonce === nonce || c.name.toUpperCase() === nonce.toUpperCase()) throw c;
        }
      } else {
        if (item.nonce && item.nonce === nonce || item.name && item.name.toUpperCase() === nonce.toUpperCase()) throw item;
      }
    });
  } catch (chain) {
    return chain as ChainConfig;
  }
};

export const getTelegramTemplate = (doc:BridgeEvent) => {
  return `<strong> Txn: <a href="${doc.fromChain && txExplorers[doc.fromChain] + doc.toHash ? doc.toHash : doc.fromHash}">${doc.fromHash}</a></strong><strong> From: ${doc.fromChainName}</strong><strong> TO: ${doc.toChainName}</strong><strong> IN PROCESSING</strong>`;
};

export default config;
