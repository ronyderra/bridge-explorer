import { ethers } from "ethers";
import { IEvent } from "../entities/IEvent";
import { IEventRepo } from "../db/repo";
import { saveWallet, } from "../db/helpers";
import { io as clientAppSocket } from "../index";
import { chainNonceToId } from "../config";
import axios from "axios";
import { BigNumber } from "bignumber.js";
import { Minter__factory } from "xpnet-web3-contracts";
import config from "../config";

export async function contractEventService(fromChain: number, eventRepo: IEventRepo, toChain?: number | undefined): Promise<any> {
  const fromObj = config.web3.filter((i) => i.nonce === fromChain.toString())[0]
  const toObj = toChain ? config.web3.filter((i) => i.nonce === toChain.toString())[0] : "theres no to chain"
  console.log("got here")
  const res = await eventRepo.getAllLastBlockScrapes();
  console.log(res)

  // try {
    //from chain data
    let fromChainName = fromObj.name;
    const fromRpc = fromObj.node
    const fromContractAddress = fromObj.contract;
    const fromProvider = await new ethers.providers.JsonRpcProvider(fromRpc);
    const fromCurrentBlock = await fromProvider.getBlockNumber();
    const fromLastBlockScraped = fromCurrentBlock - 30;//get from mongo

    // const fromData = await getContractData(fromLastBlockScraped, fromCurrentBlock, fromContractAddress, fromProvider)

    // console.log("-----------------------fromData----------------------------")
    // console.log(fromData)

    //to chain data
    // let toChainName = Object.keys(Chain).filter(e => Chain[e] === toChain)[0];
    // const toRpc = TestNetRpcUri[toChainName];
    // const toContractAddress = contractAddresses[toChainName];
    // const toProvider = await new ethers.providers.JsonRpcProvider(toRpc);
    // const toCurrentBlock = await fromProvider.getBlockNumber()
    // const toLastBlockScraped = toCurrentBlock - 30;

    // const toData = await getContractData(toLastBlockScraped, toCurrentBlock, toContractAddress, toProvider)
    // console.log("------------------------toData---------------------------")
    // console.log(toData)

    //preparing data for push to mongo   

    // for (let t = 0; t < fromData.length; t++) {
    //   const chainId = chainNonceToId(fromChain?.toString());
    //   let [exchangeRate]: any = await Promise.allSettled([
    //     (async () => {
    //       const res = await axios(
    //         `https://api.coingecko.com/api/v3/simple/price?ids=${chainId}&vs_currencies=usd`
    //       );
    //       return res.data[chainId].usd;
    //     })(),
    //   ]);

      // const event: IEvent = {
      //   chainName: fromChainName,
      //   fromChain: fromChain.toString(),//number      
      //   toChain: toChain.toString(),//number
      //   fromChainName: fromChainName,
      //   toChainName: toChainName,
      //   txFees: fromData[t].gasPrice,
      //   fromHash: fromData[t].hash && fromData[t].hash.toString(),
      //   toHash: toData[t].hash && toData[t].hash.toString(),
      //   targetAddress: toData[t].clientAddress,
      //   senderAddress: fromData[t].clientAddress,
      //   type: "Transfer",
      //   actionId: actionId,       
      //   status: "Pending",
      //   dollarFees: exchangeRate.status === "fulfilled" ? new BigNumber(
      //     ethers.utils.formatEther(fromData[t].dollarFees?.toString() || ""))
      //     .multipliedBy(exchangeRate.value)
      //     .toString()
      //     : "",
      // };
      // console.log("_________event____________")
      // console.log(event)

      // Promise.all([
      //   (async () => {
      //     return await eventRepo.createEvent(event);
      //   })(),
      //   (async () => {
      //     await saveWallet(
      //       eventRepo,
      //       event.senderAddress,
      //       event.targetAddress
      //     );
      //   })(),
      // ])
      //   .then(([doc]) => {
      //     clientAppSocket.emit("incomingEvent", doc);

      //     setTimeout(async () => {
      //       const updated = await eventRepo.errorEvent(
      //         actionId.toString(),
      //         fromChain.toString()
      //       );

      //       if (updated) {
      //         clientAppSocket.emit("updateEvent", updated);
      //       }
      //     }, 1000 * 60);
      //   })
      //   .catch(() => { });
    // }


  //   return 'success'
  // } catch (err: any) {
  //   console.log(err.message)
  // }
}

async function getContractData(LastBlockScraped: number, currentBlock: number, contractAddress: string, provider: ethers.providers.JsonRpcProvider) {

  const contract = Minter__factory.connect(contractAddress, provider);

  try {
    for (let i = 19590325; i <= 19590335; i++) {
      const blockData = await provider.getBlockWithTransactions(i);

      const allTransaction = blockData.transactions;
      const relavantTransactions = allTransaction.filter((item) => { if (item.to === contractAddress || item.from === contractAddress) { return item } })
      let relavantItemArray = []

      if (relavantTransactions.length > 0) {
        for (let j = 0; j < relavantTransactions.length; j++) {
          console.log("gethere")

          const data = await relavantTransactions[j].wait()
          let logs = data.logs
          logs.map((l) => {
            try {
              const parsed = contract.interface.parseLog(l);
              console.log(parsed)
            } catch (err) {
              console.log(err.message)
            }
          })

          let add = {
            clientAddress: relavantTransactions[j].from === contractAddress ? relavantTransactions[j].to : relavantTransactions[j].from,
            hash: relavantTransactions[j].hash,
            gasPrice: relavantTransactions[j].value ? ethers.utils.formatEther(relavantTransactions[j].value) : null,
            dollarFees: relavantTransactions[j].value
          }
          relavantItemArray.push(add)
        }
        return relavantItemArray;
      }
    }
  } catch (err) {
    console.log(err.message)
  }
}

