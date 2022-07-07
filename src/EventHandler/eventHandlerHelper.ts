import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import config from "../config";
import axios from "axios";

export const calcDollarFees = (txFees: any, exchangeRate: number, fromChain: string) => {
    if (fromChain === config.algorand.nonce) {
        return String(+txFees * exchangeRate)
    }
    if (fromChain === config.tron.nonce) {
        return new BigNumber(txFees).shiftedBy(-6).multipliedBy(exchangeRate.toFixed(2)).toString()
    }

    return new BigNumber(ethers.utils.formatEther(txFees?.toString() || ""))
        .multipliedBy(exchangeRate.toFixed(2))
        .toString();
};

export const getExchageRate = async () => (await axios('https://xp-exchange-rates.herokuapp.com/exchange/batch_data')).data;