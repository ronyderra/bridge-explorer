import createEventRepo from "../business-logic/repo";
import axios from "axios";
import { clientAppSocket } from "../index";
import { getTelegramTemplate } from "../config";

export const createEvent = async (eventObj, txHash, em , functionName = "uknown") => {
    return new Promise(async (res, rej) => {
        const createEventResponse = await createEventRepo(em.fork()).createEvent(eventObj, functionName);
        const saveWalletResponse = await createEventRepo(em.fork()).saveWallet(eventObj.senderAddress, eventObj.targetAddress!)
        if (createEventResponse) {
            console.log("TezosListener1 ------TELEGRAM FUNCTION-----")
            console.log("doc: ", createEventResponse);

            setTimeout(() => clientAppSocket.emit("incomingEvent", createEventResponse), Math.random() * 3 * 1000)
            setTimeout(async () => {
                const updated = await createEventRepo(em.fork()).errorEvent(txHash);
                clientAppSocket.emit("updateEvent", updated);
                if (updated) {
                    try {
                        console.log("before telegram operation")
                        await axios.get(`https://api.telegram.org/bot5524815525:AAEEoaLVnMigELR-dl01hgHzwSkbonM1Cxc/sendMessage?chat_id=-553970779&text=${getTelegramTemplate(createEventResponse)}&parse_mode=HTML`);
                    } catch (err) {
                        console.log(err)
                    }
                }
            }, 1000 * 60 * 20);
        }
    })
}