import { ethers } from "ethers";
import config from "../../config";

//validates evm Departure transaction 
export const validateEvmTransaction = async (fromHash: string, fromChainNumber: number) => {
    try {
        console.log("ValidateEvmTransaction Line 7 from Hash:", fromHash)
        console.log("ValidateEvmTransaction Line 8 from chain number:", fromChainNumber)

        const fromChainNameString = config.web3.find((c) => c.nonce === String(fromChainNumber))?.name;
        const rpc = fromChainNameString && config.web3.find((c) => c.name === fromChainNameString.toUpperCase())?.node;
        const provider = await new ethers.providers.JsonRpcProvider(rpc);
        const res = await provider.getTransaction(fromHash);
        const hashExistence = res ? true : false;
        
        console.log("-------validateTransaction-------", hashExistence)
        return hashExistence;

    } catch (err: any) {
        console.log(err.message)
    }
}