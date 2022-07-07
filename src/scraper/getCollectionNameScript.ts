import { MongoClient } from "mongodb";
import { ethers } from "ethers";
import { Minter__factory } from "xpnet-web3-contracts";
import axios from "axios";
import { ExitStatus } from "typescript";
import { IEvent } from "../Intrerfaces/IEvent";
import BigNumber from "bignumber.js";
import { IContractEventListener } from "../Intrerfaces/IContractEventListener";
import { bytes2Char } from "@taquito/utils";
import config, { chainNonceToName, getTelegramTemplate } from "../config";
import { io } from "socket.io-client";
import { IDatabaseDriver, Connection, EntityManager, wrap } from "@mikro-orm/core";
import { BigMapAbstraction, MichelsonMap, TezosToolkit } from "@taquito/taquito";
import createEventRepo from "../business-logic/repo";
import { getChain } from "../config";
var Web3 = require('web3');
import { JsonRpcProvider } from "@ethersproject/providers";


export const connectToMongo = async (em: EntityManager<IDatabaseDriver<Connection>>,) => {
    try {
        // const url = "mongodb+srv://dimab:dGKUNKT7FRaPhm8@dev-bridge-explorer.e5g3i.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
        // const client = new MongoClient(url);

        // const dbName = "myFirstDatabase";
        // const collectionName = "bridge-event";

        // await client.connect();
        // console.log("Connected successfully to server");
        // const db = client.db(dbName);
        // const collection = db.collection(collectionName);

        // const withoutDesHash = await collection
        //     .find({ chainName: "ETHEREUM" })
        //     .toArray();

        // console.log(withoutCollectionName.length);
        // await getAddressAndName(withoutCollectionName, collection)
        // const res = await updateTezosDocs(collection, em)
        // console.log(res)

        const chainConfig = getChain("12")!
        console.log(chainConfig)

        const web3 = new Web3(new Web3.providers.HttpProvider("https://api.harmony.one", { timeout: 5000 }));

        const provider = new JsonRpcProvider(chainConfig.node);

        const _contract = Minter__factory.connect(chainConfig.contract, provider);
        console.log('SCRAPING ', chainConfig.name);

        const c = await web3.eth.getBlockNumber()
        // console.log(c)
        const d = c - 200
        let logs = await web3.eth.getPastLogs({
            fromBlock: "28303280",
            toBlock: "28303282",
            address: "0x1358844f14feEf4D99Bc218C9577d1c7e0Cb2E89",
        });

        console.log(logs)

        const tx = await provider.getTransactionReceipt("0x20261a91518bc09b64afe38f4c5491c28f54a7ed633c1c5e77268fe6c436049c")
        // console.log(tx)
        //         const trxs = _contract.interface.parseLog(tx.logs[0])
        //         console.log(trxs)

        // logs = logs.map((log: any, i: any) => ({
        //     ...log,
        //     trx: trxs[i]
        // }))
        // console.log("log", logs)
        // for (const log of logs) {
        //     console.log("log", log)
        //     const parsed =await _contract.interface.parseLog(log);
        //     console.log(parsed);
        // }



    } catch (err) {
        console.log("get collection name error line - ", err)
    }
}



const updateTezosDocs = async (collection: any, em: EntityManager<IDatabaseDriver<Connection>>) => {
    const dataBCD = await axios.get(`https://api.better-call.dev/v1/contract/mainnet/KT1WKtpe58XPCqNQmPmVUq6CZkPYRms5oLvu/operations?entrypoints=freeze_fa2,withdraw_nft&size=1000`)
    const arrayw: any = []
    for (let i = 0; i < 50; i += 2) {
        await collection.findOne({ fromHash: dataBCD.data.operations[i].hash }).then((result: any) => {
            if (result) {

            } else {
                async function doit() {
                    console.log(i)
                    arrayw.push(dataBCD.data.operations[i])
                    const data = await axios.get(`https://api.tzkt.io/v1/operations/${dataBCD.data.operations[i].hash}`)
                    const parameter = data.data[0]?.parameter;
                    const storage = data.data[0]?.storage;
                    const target = data.data[0]?.target
                    const entrypoint = parameter?.entrypoint;

                    const eventObj: IEvent = {
                        actionId: "",
                        chainName: "TEZOS",
                        tokenId: "",
                        fromChain: "18",
                        toChain: "",
                        fromChainName: "TEZOS",
                        toChainName: "",
                        fromHash: dataBCD.data.operations[i].hash,
                        txFees: "",
                        type: "",
                        status: "Completed",
                        toHash: undefined,
                        senderAddress: "",
                        targetAddress: "",
                        nftUri: "",
                        collectionName: "",
                        contract: "",
                        createdAt: dataBCD.data.operations[i].timestamp
                    };

                    switch (entrypoint) {
                        case "freeze_fa2": {
                            eventObj.actionId = storage.action_cnt;
                            eventObj.tokenId = parameter.value.token_id;
                            eventObj.toChain = parameter.value.chain_nonce;
                            eventObj.txFees = new BigNumber(data.data[0].amount).multipliedBy(1e12).toString();
                            eventObj.type = "Transfer";
                            eventObj.senderAddress = data.data[0].sender.address;
                            eventObj.targetAddress = parameter.value?.to;
                            eventObj.contract = parameter?.value.fa2_address;
                            eventObj.collectionName = data.data[1]?.target?.alias;
                            eventObj.toChainName = chainNonceToName(parameter.value.chain_nonce.toString());
                            break;
                        }
                        case "withdraw_nft": {
                            eventObj.actionId = storage.action_cnt;
                            eventObj.tokenId = parameter.value.token_id;
                            eventObj.txFees = new BigNumber(data.data[0].amount).multipliedBy(1e12).toString();
                            eventObj.type = "Unfreez";
                            eventObj.senderAddress = data.data[0].sender?.address;
                            eventObj.targetAddress = parameter.value.to;
                            eventObj.contract = target.address;
                            eventObj.collectionName = data.data[1].target.alias;
                            eventObj.toChainName = chainNonceToName(parameter.value.chain_nonce.toString());
                            break;
                        }
                    }
                    const tezos = new TezosToolkit("https://mainnet.smartpy.io");
                    async function getUriFa2(fa2Address: string, tokenId: string): Promise<string> {
                        const contract = await tezos.contract.at(fa2Address);
                        const storage = await contract.storage<{
                            token_metadata: BigMapAbstraction;
                        }>();

                        const tokenStorage = await storage.token_metadata.get<{
                            token_info: MichelsonMap<string, string>;
                        }>(tokenId);

                        const uriFa2 = bytes2Char(tokenStorage!.token_info.get("")!);
                        console.log("tezos.ts Line 72 - Uri:", uriFa2)

                        return uriFa2;
                    }

                    try {
                        let [url, exchangeRate]:
                            | PromiseSettledResult<string>[]
                            | string[] = await Promise.allSettled([
                                (async () =>
                                    parameter.value.fa2_address &&
                                    eventObj.tokenId &&
                                    (await getUriFa2(parameter.value.fa2_address, eventObj.tokenId)))(),
                                (async () => {
                                    const res = await axios(
                                        `https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=usd`
                                    );
                                    return res.data["tezos"].usd;
                                })(),
                            ]);

                        eventObj.nftUri = url.status === "fulfilled" ? url.value : "";
                        eventObj.dollarFees =
                            exchangeRate.status === "fulfilled"
                                ? new BigNumber(ethers.utils.formatEther(eventObj.txFees))
                                    .multipliedBy(exchangeRate.value)
                                    .toString()
                                : "";
                    } catch (e) {
                        console.log(e);
                    }
                    console.log(eventObj)
                    // const [doc] = await Promise.all([
                    //   (async () => {
                    //     return await createEventRepo(em.fork()).createEvent(eventObj, "tezosListener1");
                    //   })(),
                    //   (async () => {
                    //     return await createEventRepo(em.fork()).saveWallet(eventObj.senderAddress, eventObj.targetAddress!)
                    //   })(),
                    // ])
                }
                doit()
            }
        })
    }
    return arrayw
}


const getAddressAndName = async (collectionData: any, collection: any) => {

    collectionData.forEach(async (element: any) => {
        try {
            const rpc = config.web3.find((c) => c.name === element.chainName)?.node;
            const contractAddr = config.web3.find((c) => c.name === element.chainName)?.contract;
            const provider = await new ethers.providers.JsonRpcProvider(rpc);

            const res = await provider.getTransaction(element.fromHash);

            if (contractAddr && provider) {
                const contract = Minter__factory.connect(contractAddr!, provider);
                const decoded = contract.interface.parseTransaction(res);
                const args = decoded.args
                const address = args["erc721Contract"] || args["burner"] || "not found"

                // if (address !== undefined) {
                //     const res = await collection.updateMany(
                //         { fromHash: element.fromHash },
                //         { $set: { contract: address.toString() } }
                //     );
                //     console.log(res)
                // }

                // if (address !== undefined) {
                //     const contractInstance = await new ethers.Contract(address, abi, provider);
                //     const res = await contractInstance.functions.name();
                //     console.log(res[0]);
                //     if (res[0]) {
                //         await collection.updateMany(
                //             { fromHash: element.fromHash },
                //             { $set: { collectionName: res[0] } }
                //         );
                //     }

                // }
            }
        } catch (err: any) {
            console.log(err.message)
        }
    });
}

const abi = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "approved", "type": "address" },
            { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "operator", "type": "address" },
            { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }
        ],
        "name": "ApprovalForAll",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "previousAdminRole",
                "type": "bytes32"
            },
            { "indexed": true, "internalType": "bytes32", "name": "newAdminRole", "type": "bytes32" }
        ],
        "name": "RoleAdminChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" },
            { "indexed": true, "internalType": "address", "name": "account", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }
        ],
        "name": "RoleGranted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" },
            { "indexed": true, "internalType": "address", "name": "account", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }
        ],
        "name": "RoleRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
            { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "DEFAULT_ADMIN_ROLE",
        "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "MINTER_ROLE",
        "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "baseURI",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "getApproved",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }],
        "name": "getRoleAdmin",
        "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "role", "type": "bytes32" },
            { "internalType": "address", "name": "account", "type": "address" }
        ],
        "name": "grantRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "role", "type": "bytes32" },
            { "internalType": "address", "name": "account", "type": "address" }
        ],
        "name": "hasRole",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "string", "name": "_uri", "type": "string" }],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "address", "name": "operator", "type": "address" }
        ],
        "name": "isApprovedForAll",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_to", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "ownerOf",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "role", "type": "bytes32" },
            { "internalType": "address", "name": "account", "type": "address" }
        ],
        "name": "renounceRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "role", "type": "bytes32" },
            { "internalType": "address", "name": "account", "type": "address" }
        ],
        "name": "revokeRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "from", "type": "address" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "from", "type": "address" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "internalType": "bytes", "name": "_data", "type": "bytes" }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "operator", "type": "address" },
            { "internalType": "bool", "name": "approved", "type": "bool" }
        ],
        "name": "setApprovalForAll",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "string", "name": "_uri", "type": "string" }],
        "name": "setBaseURI",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }],
        "name": "supportsInterface",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
        "name": "tokenByIndex",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "uint256", "name": "index", "type": "uint256" }
        ],
        "name": "tokenOfOwnerByIndex",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "tokenURI",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "from", "type": "address" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "transferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]
