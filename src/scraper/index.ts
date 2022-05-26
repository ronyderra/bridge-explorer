import { MikroORM, IDatabaseDriver, Connection, wrap, EntityManager } from "@mikro-orm/core";

import IndexUpdater from "../services/indexUpdater";
import { Minter__factory } from "xpnet-web3-contracts";
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
import { BlockRepo } from "../entities/IBlockRepo";
import { eventHandler } from "../listeners/handlers";
import createEventRepo from "../db/repo";
import cron from 'node-cron'
import Web3 from "web3";
import { getChain } from "../config";
//import { EntityManager,  } from "@mikro-orm/mongodb";


export const scrap = async (
  em: EntityManager<IDatabaseDriver<Connection>>,
  chain: string,
) => {

  const chainConfig = getChain(chain)!

 // if (!chainConfig) return

  const provider = new JsonRpcProvider(chainConfig.node);


  const web3 = new Web3(
    new Web3.providers.HttpProvider(chainConfig.node, {
      timeout: 5000,
    })
  );

  //console.log((await web3.eth.getTransactionReceipt('0x26b57142045d2c9dba65f495bee6c9091ccd885d0f242456703114e209a6fb9a')).logs.map(l => console.log(l.topics)));

  


  const _contract = Minter__factory.connect(chainConfig.contract, provider);


  //const p = Minter__factory.connect('0x14cab7829b03d075c4ae1acf4f9156235ce99405', new JsonRpcProvider('https://polygon-rpc.com'))

//console.log(await IndexUpdater.instance.getDestTrxData('0x65191f5648a5768f4a88fda7be892842b558196838c67d843bced3e787c706e0', 'ETHEREUM', provider));

/*let a = await new Web3(
  new Web3.providers.HttpProvider(getChain('4')?.node!, {
    timeout: 5000,
  })
).eth.getPastLogs({
  fromBlock: 18080582,
  toBlock: 18080582,
  address: '0x0b7ed039dff2b91eb4746830eadae6a0436fc4cb',
});

let b = await new Web3(
  new Web3.providers.HttpProvider(getChain('7')?.node!, {
    timeout: 5000,
  })
).eth.getPastLogs({
  fromBlock: 28723906,
  toBlock: 28723906,
  address: '0x2d317eD6C2e3EB5C54CA7518Ef19deEe96C15c85'
});


console.log(a);

console.log(b);*/


  cron.schedule("*/7 * * * * *", async () => {

    //const tm = Date.now()

    let blocks = await em.findOne(BlockRepo, {
      chain,
    });

;
  
    //const currentBlock = await web3.eth.getBlockNumber()
  
    if (!blocks) {
      blocks = new BlockRepo({
        chain,
        lastBlock: await web3.eth.getBlockNumber() - 1,
        timestamp: Math.floor(+new Date() / 1000),
      });
      await em.persistAndFlush(blocks);
    }
  
    const fromBlock = blocks.lastBlock + 1
  
    let logs = await web3.eth.getPastLogs({
      fromBlock,
      toBlock: 'latest',
      address: chainConfig.contract,
    });
    
    console.log(`found ${logs.length} in ${chainConfig.name}::from block ${blocks.lastBlock}`);
  
     const trxs = await Promise.all(logs.map(async (log) =>  web3.eth.getTransaction(log.transactionHash)))
  
    logs = logs.map((log, i) => ({
        ...log,
        trx: trxs[i]
    })) 
  
  
    for (const log of logs) {
  
  
      try {
        const parsed = _contract.interface.parseLog(log);
        
        const args = parsed.args;
  
        let nftUrl = ''
  
        if (parsed.name.includes("Unfreeze")) {
          nftUrl = String(args["baseURI"]).split("{")[0] + String(args["tokenId"]);
        } else {
          if (args["tokenData"].includes('0x{id}')) {
              nftUrl = String(args["tokenData"]).replace('0x{id}', String(args["id"]));
              
          } else {
              nftUrl = String(args["tokenData"]).includes('{id}') ? String(args["tokenData"]).split("{")[0] + String(args["id"]): String(args["tokenData"])
          }
          
        }
  
        const eventData = {
          actionId: String(args["actionId"]),
          from: chain,
          to: String(args["chainNonce"]),
          //@ts-ignore
          sender: log.trx.from,
          target: String(args["to"]),
          hash: log.transactionHash,
          txFees: String(args["txFees"]),
          tokenId: parsed.name.includes("Unfreeze")
            ? String(args["tokenId"])
            : String(args["id"]),
          type: parsed.name.includes("Unfreeze") ? "Unfreeze" : "Transfer" as "Unfreeze" | "Transfer",
          uri: nftUrl,
          contract: parsed.name.includes("Unfreeze")
            ? String(args["burner"])
            : String(args["mintWith"]),
        };
        
        console.log(eventData);
  
        eventHandler(em.fork())(eventData)
       

      } catch (_) {
        console.log(_);
        return [];
      }
    }
    //console.log((Date.now() - tm)/1000);
  
    if (!logs.length) {
        return
    }
  
    blocks &&
      wrap(blocks).assign(
        {
          lastBlock: logs[logs.length - 1].blockNumber,
          timestamp: Math.floor(+new Date() / 1000),
        },
        { em}
      );
  
    await em.flush();



  });
};
