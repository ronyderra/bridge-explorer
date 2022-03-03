
import { IEventRepo } from "./repo";

const saveWallet = async  function (eventRepo:IEventRepo, senderAddress:string | undefined, to:string | undefined) {
    if (senderAddress) {
    const walletFrom = await eventRepo.findWallet(senderAddress);
     if (!walletFrom) await eventRepo.createWallet({address: senderAddress});
    }
     
     
     if (to && senderAddress !== to) {
     const walletTo = await eventRepo.findWallet(to);
     if (!walletTo) await eventRepo.createWallet({address: to});
     }
}

export {saveWallet}