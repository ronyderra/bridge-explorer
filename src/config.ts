import dotenv from "dotenv";

dotenv.config();

export const currency: any = {
  "4": "BNB",
  "19": "VLX",
  "14": "xDAI",
  "2": "EGLD",
  "20": "IOTX",
  "16": "Fuse",
  "6": "AVAX",
  "21": "AETH",
  "7": "MATIC",
  "5": "ETH",
  "8": "FTM",
  "12": "ONE",
  "18": "TEZ"

};

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
  "18": "https://tezblock.io/transaction/"
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
  "18": "https://tezblock.io/account/"
};

export const chains = [
  {
    id: "aurora-near",
    name: "AURORA",
    icon: "./assets/icons/aurora.svg",
  },
  { id: "binancecoin", name: "BSC", icon: "./assets/icons/bsc.svg" },
  { id: "ethereum", name: "Ethereum", icon: "./assets/icons/ethereum.svg" },
  { id: "velas", name: "Velas", icon: "./assets/icons/velas.svg" },
  { id: "matic-network", name: "Polygon", icon: "./assets/icons/polygon.svg" },
  {
    id: "avalanche-2",
    name: "Avalanche",
    icon: "./assets/icons/avalanche.svg",
  },
  { id: "iotex", name: "Iotex", icon: "./assets/icons/iotex.svg" },
  { id: "fantom", name: "Fantom", icon: "./assets/icons/fantom.svg" },
  // { id: "celo", name: "Celo", icon: "./assets/icons/celo.svg" },
  { id: "harmony", name: "Harmony", icon: "./assets/icons/harmony.svg" },
  { id: "gnosis", name: "Gnosis", icon: "./assets/icons/gnosis.svg" },
  { id: "fuse-network-token", name: "Fuse", icon: "./assets/icons/fuse.svg" },
  // { id: "unique-one", name: "Unique", icon: "./assets/icons/unique.svg" }, // TODO: check if this is correct
  { id: "elrond-erd-2", name: "Elrond", icon: "./assets/icons/elrond.svg" },
  {id: "tezos", name: "Tezos", icon: "./assets/icons/tezos.svg"}
];

function getOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key}`);
  }
  return value;
}

const config = {
  web3: [
    {
      name: "AURORA",
      node: getOrThrow("AURORA_RPC_URL"),
      contract: getOrThrow("AURORA_MINTER_ADDRESS"),
      nonce: getOrThrow("AURORA_NONCE"),
    },
    {
      name: "BSC",
      node: getOrThrow("BSC_RPC_URL"),
      contract: getOrThrow("BSC_MINTER_ADDRESS"),
      nonce: getOrThrow("BSC_NONCE"),
    },
    {
      name: "ETHEREUM",
      node: getOrThrow("ETHEREUM_RPC_URL"),
      contract: getOrThrow("ETHEREUM_MINTER_ADDRESS"),
      nonce: getOrThrow("ETHEREUM_NONCE"),
    },
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
      name: "IOTEX",
      node: getOrThrow("IOTEX_RPC_URL"),
      contract: getOrThrow("IOTEX_MINTER_ADDRESS"),
      nonce: getOrThrow("IOTEX_NONCE"),
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
    {
      name: "HARMONY",
      node: getOrThrow("HARMONY_RPC_URL"),
      contract: getOrThrow("HARMONY_MINTER_ADDRESS"),
      nonce: getOrThrow("HARMONY_NONCE"),
    },
    {
      name: "GNOSIS CHAIN",
      node: getOrThrow("GNOSIS_RPC_URL"),
      contract: getOrThrow("GNOSIS_MINTER_ADDRESS"),
      nonce: getOrThrow("GNOSIS_NONCE"),
    },
   /* {
      name: "TEZOS",
      node: getOrThrow("TEZOS_RPC_URL"),
      contract: getOrThrow("TEZOS_MINTER_ADDRESS"),
      nonce: getOrThrow("TEZOS_NONCE"),
    },*/
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
    name: "ELROND",
    node: getOrThrow("ELROND_RPC_URL"),
    contract: getOrThrow("ELROND_MINTER_ADDRESS"),
    nonce: getOrThrow("ELROND_NONCE"),
    socket: getOrThrow("ELROND_SOCKET_URL"),
  },
  tezos : {
    name: "TEZOS",
    socket: getOrThrow("TEZOS_RPC_URL"),
    contract: getOrThrow("TEZOS_MINTER_ADDRESS"),
    nonce: getOrThrow("TEZOS_NONCE"),
  },
  db: getOrThrow("DB_URL"),
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
};

export function chainNonceToName(nonce: string) {
  let chain = config.web3.find((chain) => chain.nonce === nonce);

  if (chain)
    return chain.name;

  
    for (const key of ['elrond', 'tezos']) {
      //@ts-ignore
        if (nonce == config[key].nonce) {
          //@ts-ignore
          return config[key].name
        }    
    }

    return "UNKNOWN";
  }



console.log(chainNonceToName("20"));

export default config;
//0x5B916EFb0e7bc0d8DdBf2d6A9A7850FdAb1984C4
