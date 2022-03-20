
import WebSocket from "ws";
import { Base64 } from "js-base64";
import BigNumber from "bignumber.js";
import { IContractEventListener } from "./web3";
import { bytes2Char, char2Bytes } from "@taquito/utils";
import { EvResp } from "../entities/EvResp";
import { IEventRepo } from "../db/repo";
import config, { chainNonceToName } from "../config";
import axios from "axios";
import { IERC721WrappedMeta } from "../entities/ERCMeta";

import { io as clientAppSocket } from "../index";
import { io } from "socket.io-client";
import index from "../index";
import { IEvent } from "../entities/IEvent";


import {
    MichelsonV1Expression,
    MichelsonV1ExpressionBase,
    MichelsonV1ExpressionExtended,
    OperationContentsAndResult,
    OperationContentsAndResultTransaction,
    OperationResultTransaction,
    OpKind,
} from '@taquito/rpc';

import {
    BigMapAbstraction,
    MichelCodecPacker,
    MichelsonMap,
    OperationContent,
    TezosToolkit,
} from '@taquito/taquito';



function isTransactionResult(
    data: OperationContent | OperationContentsAndResult
): data is OperationContentsAndResultTransaction {
    return data.kind == OpKind.TRANSACTION;
}



export function tezosEventListener(
    rpc: string,
    contract: string,
    chainName: string,
    chainNonce: string,
    eventRepo: IEventRepo
  ): IContractEventListener {
    const tezos = new TezosToolkit(rpc);
    const sub = tezos.stream.subscribeOperation({
        destination: contract,
    });



    async function getUriFa2(fa2Address: string, tokenId: string): Promise<string> {
        const contract = await tezos.contract.at(fa2Address);
        const storage = await contract.storage<{ token_metadata: BigMapAbstraction }>();
        const tokenStorage = await storage.token_metadata.get<{ token_info: MichelsonMap<string, string> }>(tokenId);
        return bytes2Char(tokenStorage!.token_info.get("")!);
    }
    
    

    return {
        listen: async () => {

            sub.on(
                'data',
                async (
                    data: OperationContent | OperationContentsAndResult
                ) => {

                    if (
                        !isTransactionResult(data) ||
                        !data.parameters
                       // data.metadata.operation_result.status != 'applied' ||
                        //data.destination != bridgeContract.address
                    ) {
                        return;
                    }

                    console.log(data);
                    console.log(new BigNumber(data.amount), 'amount');
                    console.log(data.destination);
                    console.log(data.metadata, 'meta');
                    console.log(data.parameters.entrypoint);
                    
                    const params = data.parameters.value as MichelsonV1ExpressionExtended;
                    const fullParmams = params.args as MichelsonV1ExpressionExtended[];
                    const param1 = fullParmams[0] as MichelsonV1ExpressionExtended;
                    const param2 = fullParmams[1] as MichelsonV1ExpressionExtended;

                    const tchainNonce = param1.args![0] as MichelsonV1ExpressionBase;
                    console.log(tchainNonce, 'tchainNonce');
                    const fa2Address = param1.args![1] as MichelsonV1ExpressionBase;
                    const to = param2.args![0] as MichelsonV1ExpressionBase;
                    console.log(to, 'to');
                    const tokenId = param2.args![1] as MichelsonV1ExpressionBase;
                    console.log(tokenId, 'tokenId');
                    console.log(  await getUriFa2(fa2Address.string!, tokenId.int!));
                  
                   /* const eventObj:IEvent = {
                        actionId: '',
                        chainName,
                        tokenId: tokenId.toString(),
                        fromChain: chainNonce,
                        toChain: chain_nonce.toString(),
                        fromChainName: chainNonceToName(chainNonce),
                        toChainName: chainNonceToName(chain_nonce.toString()),
                        fromHash: "N/A",
                        txFees: tx_fees.toString(),
                        type: "Transfer",
                        status: "Pending",
                        toHash: undefined,
                        senderAddress: "N/A",
                        targetAddress: to,
                        nftUri: "N/A",
                        
                    }*/
                }
            );
                
        }

  }

  }