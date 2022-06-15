import BigNumber from 'bignumber.js'
import IndexUpdater from '../../services/indexUpdater'
import { chainNonceToName } from '../../config'
import { IEventhandler } from '../../handlers/index'
import { getCollectionName, getContractAddress } from "../../services/getCollectionData"
import config from '../../config'

export const handleBridgeEvent = async ({
    fromChain,
    fromHash,
    actionId,
    type,
    toChain,
    txFees,
    senderAddress,
    targetAddress,
    nftUri,
    eventTokenId,
    eventContract
}: {
    fromChain: number
    fromHash: string
    actionId?: string
    type?: 'Transfer' | 'Unfreeze'
    toChain?: number
    txFees?: BigNumber
    senderAddress?: string
    targetAddress?: string
    nftUri?: string
    eventTokenId?: string
    eventContract?: string
    collectionName?: string
}) => {
    if (actionId && type) {
        const [trxData]: any = await Promise.allSettled([
            (async () => {
                const fromChainName = config.web3.find((c) => c.nonce === String(fromChain))?.name;
                const collectionName = fromChainName && await getCollectionName(fromHash, fromChainName)
                const contractAddress = fromChainName && await getContractAddress(fromHash, fromChainName)
                if (eventTokenId && eventContract) {
                    console.log("evm.ts line 45", collectionName)
                    console.log("evm.ts line 46", contractAddress)
                    return {
                        tokenId: eventTokenId,
                        collName: collectionName,
                        contractAdd: contractAddress
                    }
                }
                return await IndexUpdater.instance.getDepTrxData(
                    fromHash,
                    chainNonceToName(String(fromChain))
                )
            })()
        ])
        console.log("--------------TRXDATA-----------:", trxData)
        const res: IEventhandler = {
            actionId,
            from: String(fromChain),
            to: String(toChain),
            sender: senderAddress!,
            target: targetAddress!,
            hash: fromHash,
            tokenId: trxData.status === 'fulfilled' ? trxData.value.tokenId : undefined,
            type,
            txFees: txFees?.toString() || '',
            uri: nftUri || '',
            contract: trxData.status === 'fulfilled' ? trxData.value.contractAdd : undefined,
            collectionName: trxData.status === 'fulfilled' ? trxData.value.collName : undefined
        }
        console.log("evm.ts line 75", res)
        return res
    }
}


