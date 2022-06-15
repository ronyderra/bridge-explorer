
import { IEventRepo } from "../business-logic/repo";
import {Request, Response, NextFunction} from 'express'
import axios from "axios";
import config from "../config";
import { BigNumber } from "@ethersproject/bignumber";
import { isHexString, isBytes } from "@ethersproject/bytes";
import { BigNumberish } from "@ethersproject/bignumber";

const saveWallet = async  function (eventRepo:IEventRepo, senderAddress:string | undefined, to:string | undefined) {
    Promise.all([
        senderAddress ? eventRepo.findWallet(senderAddress): undefined,
        to? eventRepo.findWallet(to): undefined
    ]).then(async ([walletFrom, walletTo]) => {
        if (!walletFrom && senderAddress) await eventRepo.createWallet({address: senderAddress});
        if (!walletTo && to && senderAddress !== to) await eventRepo.createWallet({address: to!});
    }).catch((err) => console.log(err))
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const captchaProtected = async (req:Request, res:Response, next:NextFunction) => {
    try {
            if (!req.body.token &&  !req.query.token)
                return res.status(401).json({ message: "Unauthtorized" });

            const { data } = await axios(
                `https://www.google.com/recaptcha/api/siteverify?secret=${config.captcha_secret}&response=${req.body?.token || req.query.token}`
            );

            if (!data?.success)
                return res.status(401).json({ message: "Unauthtorized" });

            next();
        } catch(e) {
                console.log(e);
        }
}

function isBigNumberish(value: any): value is BigNumberish {
    return (value != null) && (
        BigNumber.isBigNumber(value) ||
        (typeof(value) === "number" && (value % 1) === 0) ||
        (typeof(value) === "string" && !!value.match(/^-?[0-9]+$/)) ||
        isHexString(value) ||
        (typeof(value) === "bigint") ||
        isBytes(value)
    );
}

export {saveWallet, captchaProtected, isBigNumberish, delay}


