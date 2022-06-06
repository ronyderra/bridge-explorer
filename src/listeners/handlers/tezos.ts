import signalR from "@microsoft/signalr";
import axios from "axios";

export async function init() {
    try {
        // const res = await axios.get('https://staging.api.tzkt.io/v1/operations/transactions', { params: { sender: "KT1WKtpe58XPCqNQmPmVUq6CZkPYRms5oLvu" } });
        // const mappedHash = res.data.filter((i: any) => i.hash === "ooWPQua2ZMPUcWNgeUq2eiWitbV9ipw8bQNRcQPXgFyx824w8cM")
        // const array = mappedHash[0].parameter.value[0].list ? mappedHash[0].parameter.value[0].list : mappedHash[0].parameter.value[0].txs
        // const tokenId = array[0].token_id;
        // console.log(tokenId)



        const exchangeRate = await axios(`https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd`);
console.log(exchangeRate.data.tron.usd)
    } catch (err: any) {
        console.log(err.message)
    }


};
