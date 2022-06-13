import BigNumber from 'bignumber.js'
import { UserNftMinter__factory } from 'xpnet-web3-contracts'
import { providers, BigNumber as BN } from 'ethers'
import axios from 'axios'
import IndexUpdater from '../../services/indexUpdater'
import { chainNonceToName } from '../../config'
import { IERC721WrappedMeta } from '../../entities/ERCMeta'
import { IEventhandler } from './index'

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
}) => {
    if (actionId && type) {
        const [trxData]: any = await Promise.allSettled([
            (async () => {
                if (eventTokenId && eventContract)
                    return {
                        tokenId: eventTokenId,
                        contractAddr: eventContract
                    }
                return await IndexUpdater.instance.getDepTrxData(
                    fromHash,
                    chainNonceToName(String(fromChain))
                )
            })()
        ])

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
            contract: trxData.status === 'fulfilled' ? trxData.value.contractAddr : undefined,
        }
        return res
    }
}

export const handleNativeTransferEvent = (fromChain: string, provider: providers.Provider) =>
    async ({
        actionId,
        targetNonce,
        txFees,
        to,
        tokenId,
        contract,
        event
    }: {
        actionId: BN
        targetNonce: BN
        txFees: BN
        to: string
        tokenId: BN
        contract: string
        tokenData: string
        mintWith: string
        event: any
    }) => {
        const NFTcontract = UserNftMinter__factory.connect(contract, provider)

        const [nftUri, senderAddress, trxData] = await Promise.allSettled([
            (async () => await NFTcontract.tokenURI(tokenId))(),
            (async () => (await event.getTransaction()).from)(),
            (async () =>
                await IndexUpdater.instance.getDepTrxData(
                    event.transactionHash,
                    chainNonceToName(fromChain)
                ))(),
        ])

        const res: IEventhandler = {
            actionId: String(actionId),
            from: String(fromChain),
            to: String(targetNonce),
            sender: senderAddress.status === 'fulfilled' ? senderAddress.value : '',
            target: to,
            hash: event.transactionHash,
            tokenId: String(tokenId),
            type: 'Transfer',
            txFees: txFees?.toString() || '',
            uri: nftUri.status === 'fulfilled' ? nftUri.value : '',
            contract: trxData.status === 'fulfilled' ? trxData.value.contractAddr : '',
        }
        return res
    }

export const handleNativeUnfreezeEvent = (fromChain: string, provider: providers.Provider) =>
    async ({
        actionId,
        _,
        txFees,
        target,
        burner,
        tokenId,
        baseUri,
        event
    }: {
        actionId: BN
        _: any
        txFees: BN
        target: string
        burner: string
        tokenId: BN
        baseUri: string
        event: any
    }) => {
        console.log({
            actionId,
            _,
            txFees,
            target,
            burner,
            tokenId,
            baseUri,
            event
        })

        let [wrappedData, senderAddress, trxData]: any = await Promise.allSettled([
            (async () =>
                await axios
                    .get<IERC721WrappedMeta>(baseUri.split('{id}')[0] + String(tokenId))
                    .catch((e: any) => console.log('Could not fetch data')))(),
            (async () => (await event.getTransaction()).from)(),
            (async () => {
                return await IndexUpdater.instance.getDepTrxData(
                    event.transactionHash,
                    chainNonceToName(fromChain)
                )
            })(),


        ])

        wrappedData = wrappedData.status === 'fulfilled' ? wrappedData.value : ''
        senderAddress = senderAddress.status === 'fulfilled' ? senderAddress.value : ''

        const res: IEventhandler = {
            actionId: String(actionId),
            from: String(fromChain),
            to: wrappedData?.data?.wrapped?.origin || 'N/A',
            sender: senderAddress,
            target,
            hash: event.transactionHash,
            tokenId: wrappedData?.data?.wrapped.tokenId || '',
            type: 'Unfreeze',
            txFees: txFees?.toString() || '',
            uri: wrappedData?.data?.wrapped?.original_uri || '',
            contract: trxData.status === 'fulfilled' ? trxData.value.contractAddr : '',
        }
        return res
    }
