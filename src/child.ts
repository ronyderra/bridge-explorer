import { explorerDB, indexerDb } from "./mikro-orm.config";
import { MikroORM } from "@mikro-orm/core";
import { BridgeEventService } from "./listeners/bridge";
import createEventRepo from "./db/repo";

const chainsTolisten: string[] = [];


async function listen() {
    const orm = await MikroORM.init(explorerDB);
    BridgeEventService(createEventRepo(orm)).listen();
}

process.on('message', async (chain: string) => {
    chainsTolisten.push(chain.toString())
    if (chainsTolisten.length === 1) listen()
    //const argument = process.argv.find(arg => arg.includes('listenForChains'));
    //if (!argument) process.exit(9);

    //const {listenForChains} = JSON.parse(argument);

    //console.log(listenForChains);

    //const orm = await MikroORM.init(explorerDB);
    //BridgeEventService(createEventRepo(orm)).listen();

})






export default true