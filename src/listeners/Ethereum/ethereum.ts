// import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
// import axios from "axios"

// interface IContractEventListener {
//     listenBridge(): void;
// }

// export function EvmEventService(em: EntityManager<IDatabaseDriver<Connection>>): IContractEventListener {
//     return {
//         listenBridge: async () => {
//             setInterval(async () => {
//                 const dataBCD = await axios.get(`https://api.better-call.dev/v1/contract/mainnet/KT1WKtpe58XPCqNQmPmVUq6CZkPYRms5oLvu/operations?entrypoints=freeze_fa2,withdraw_nft`)
//             }, 10000)
//         }
//     }
// }
