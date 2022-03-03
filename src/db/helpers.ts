
import { IEventRepo } from "./repo";

const saveWallet = async  function (eventRepo:IEventRepo, senderAddress:string | undefined, to:string | undefined) {
    Promise.all([
        senderAddress ? eventRepo.findWallet(senderAddress): undefined,
        to? eventRepo.findWallet(to): undefined
    ]).then(async ([walletFrom, walletTo]) => {
        if (!walletFrom && senderAddress) await eventRepo.createWallet({address: senderAddress});
        if (!walletTo && to && senderAddress !== to) await eventRepo.createWallet({address: to!});
    }).catch((err) => console.log(err))
}

export {saveWallet}