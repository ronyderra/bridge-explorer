import { ethers } from "ethers";
import { IEvent } from "../entities/IEvent";
import { IEventRepo } from "../db/repo";
import { saveWallet } from "../db/helpers";
import { io as clientAppSocket } from "../index";

const TestNetRpcUri: any = {
  ELROND: "https://devnet-api.elrond.com",
  HECO: "https://http-testnet.hecochain.com",
  BSC: "https://speedy-nodes-nyc.moralis.io/3749d19c2c6dbb6264f47871/bsc/testnet/archive",
  ROPSTEN: "https://speedy-nodes-nyc.moralis.io/3749d19c2c6dbb6264f47871/eth/ropsten/archive",
  AVALANCHE: "https://api.avax-test.network/ext/bc/C/rpc",
  POLYGON: "https://speedy-nodes-nyc.moralis.io/3749d19c2c6dbb6264f47871/polygon/mumbai/archive",
  FANTOM: "https://rpc.testnet.fantom.network/",
  TRON: "https://api.shasta.trongrid.io/",
  CELO: "https://alfajores-forno.celo-testnet.org",
  HARMONY: "https://api.s0.b.hmny.io",
  XDAI: "https://sokol.poa.network",
  UNIQUE: "https://rpc-opal.unique.network/",
  TEZOS: "https://hangzhounet.smartpy.io",
  VELAS: "https://explorer.testnet.velas.com/rpc",
  IOTEX: "https://babel-api.testnet.iotex.io",
  AURORA: "https://testnet.aurora.dev/",
  GODWOKEN: "https://godwoken-testnet-web3-v1-rpc.ckbapp.dev",
  GATECHAIN: "https://meteora-evm.gatenode.cc",
  VECHAIN: "https://sync-testnet.veblocks.net",
}

const Chain: any = {
  ELROND: 2,
  HECO: 3,
  BSC: 4,
  ETHEREUM: 5,
  AVALANCHE: 6,
  POLYGON: 7,
  FANTOM: 8,
  TRON: 9,
  CELO: 11, //11
  HARMONY: 12, //12
  ONT: 13, //13
  XDAI: 14, //14
  ALGORAND: 15, //15
  FUSE: 16, // 16
  UNIQUE: 17, // 17
  TEZOS: 18, // 18
  VELAS: 19, // 19
  IOTEX: 20, // 20
  AURORA: 21, // 21
  GODWOKEN: 22, // 22
  GATECHAIN: 23, // 23
  VECHAIN: 25, // 25
}

const contractAddresses: any = {
  ELROND: "erd1qqqqqqqqqqqqqpgqnd6nmq4vh8e3xrxqrxgpwfldgp3sje83k4as3lusln",
  // HECO: 3,
  BSC: "0x3Dd26fFf61D2a79f5fB77100d6daDBF073F334E6",
  // ETHEREUM: 5,
  AVALANCHE: "0xDdF1f6B8Ae8cd26dBE7C4C3ed9ac8E6D8B3a4FdC",
  POLYGON: "0x224f78681099D66ceEdf4E52ee62E5a98CCB4b9e",
  FANTOM: "0x9a287810bA8F0564DaDd9F2Ea9B7B2459497416B",
  TRON: "TY46GA3GGdMtu9GMaaSPPSQtqq9CZAv5sK",
  // CELO: 11, //11
  // HARMONY: 12, //12
  // ONT: 13, //13
  // XDAI: 14, //14
  // ALGORAND: 15, //15
  // FUSE: 16, // 16
  // UNIQUE: 17, // 17
  // TEZOS: 18, // 18
  // VELAS: 19, // 19
  // IOTEX: 20, // 20
  // AURORA: 21, // 21
  // GODWOKEN: 22, // 22
  // GATECHAIN: 23, // 23
  VECHAIN: "0x4096e08C5d6270c8cd873daDbEAB575670aad8Bc", // 25
}

export async function contractEventService(fromChain: number, eventRepo: IEventRepo, toChain?: number | undefined): Promise<any> {
  try {
    //from chain data
    let fromChainName = Object.keys(Chain).filter(e => Chain[e] === fromChain)[0];
    const fromRpc = TestNetRpcUri[fromChainName];
    const fromContractAddress = contractAddresses[fromChainName];
    const fromProvider = await new ethers.providers.JsonRpcProvider(fromRpc);
    const fromCurrentBlock = await fromProvider.getBlockNumber()
    const fromLastBlockScraped = fromCurrentBlock - 30;
    const actionId = "4"

    const fromData = await getData(fromLastBlockScraped, fromCurrentBlock, fromContractAddress, fromProvider)
    console.log("-----------------------fromData----------------------------")
    console.log(fromData)

    //to chain data
    let toChainName = Object.keys(Chain).filter(e => Chain[e] === toChain)[0];
    const toRpc = TestNetRpcUri[toChainName];
    const toContractAddress = contractAddresses[toChainName];
    const toProvider = await new ethers.providers.JsonRpcProvider(toRpc);
    const toCurrentBlock = await fromProvider.getBlockNumber()
    const toLastBlockScraped = toCurrentBlock - 30;

    const toData = await getData(toLastBlockScraped, toCurrentBlock, toContractAddress, toProvider)
    console.log("------------------------toData---------------------------")
    console.log(toData)

    //preparing data for push to mongo   
    const event: IEvent = {    
      chainName: fromChainName,
      fromChain: fromChain.toString(),//number      
      toChain: toChain.toString(),//number
      fromChainName:fromChainName,
      toChainName:toChainName,
      txFees: fromData.gasPrice,
      fromHash: fromData.hash && fromData.hash.toString(),
      toHash: toData.hash && toData.hash.toString(),
      targetAddress: toData.clientAddress,
      senderAddress: fromData.clientAddress,
      type: "Transfer",
      actionId: actionId,
      status: "Pending"
      // nftUri: ,
    };
    console.log("_________event____________")
    console.log(event)

    Promise.all([
      (async () => {
        return await eventRepo.createEvent(event);
      })(),
      (async () => {
        await saveWallet(
          eventRepo,
          event.senderAddress,
          event.targetAddress
        );           
      })(),
    ])
      .then(([doc]) => {
        clientAppSocket.emit("incomingEvent", doc);

        setTimeout(async () => {
          const updated = await eventRepo.errorEvent(
            actionId.toString(),
            fromChain.toString()
          );

          if (updated) {
            clientAppSocket.emit("updateEvent", updated);
          }
        }, 1000 * 60);
      })
      .catch(() => { });

    return 'success'
  } catch (err: any) {
    console.log(err.message)
  }
}

async function getData(
  LastBlockScraped: number,
  currentBlock: number,
  contractAddress: string,
  provider: ethers.providers.JsonRpcProvider) {

  for (let i = 19588860; i <= 19588870; i++) {
    console.log(i)
    const blockData = await provider.getBlockWithTransactions(i);
    const allTransaction = blockData.transactions;

    const relavantItem = allTransaction.filter((item) => { if (item.to === contractAddress || item.from === contractAddress) { return item } })
    if (relavantItem.length > 0) {
      let add = {
        clientAddress: relavantItem[0].from === contractAddress ? relavantItem[0].to : relavantItem[0].from,
        hash: relavantItem[0].hash,
        gasPrice: relavantItem[0].value ? ethers.utils.formatEther(relavantItem[0].value) : null
      }
      return add;
    }
  }
}

async function pushToMongo() {

}
