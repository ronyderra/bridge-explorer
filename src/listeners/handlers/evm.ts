import BigNumber from 'bignumber.js'

import { Minter, UserNftMinter__factory } from 'xpnet-web3-contracts'

import { providers, BigNumber as BN } from 'ethers'

import axios from 'axios'

import IndexUpdater from '../../services/indexUpdater'
import { chainNonceToName } from '../../config'

import { IERC721WrappedMeta } from '../../entities/ERCMeta'

import { IEventhandler, calcDollarFees } from './index'

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

//String()

export const handleNativeTransferEvent =
    (fromChain: string, provider: providers.Provider) =>
        async ({
            actionId,
            targetNonce,
            txFees,
            to,
            tokenId,
            contract,
            tokenData,
            mintWith,
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

export const handleNativeUnfreezeEvent =
    (fromChain: string, provider: providers.Provider) =>
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
//const a = (await em.find(BridgeEvent, {})).at(0)

  //const date = moment(a?.createdAt).utcOffset(0).add(1, 'hour').toDate();

  //console.log((await web3.eth.getTransactionReceipt('0x26b57142045d2c9dba65f495bee6c9091ccd885d0f242456703114e209a6fb9a')).logs.map(l => console.log(l.topics)));

  //const p = Minter__factory.connect('0x14cab7829b03d075c4ae1acf4f9156235ce99405', new JsonRpcProvider('https://polygon-rpc.com'))


  //console.log(await IndexUpdater.instance.getDepTrxData('0x740f3eb4e349630f6853932cd0fe6196c06b75de1ceb799ff9c1153a0ac670ad', 'ETHEREUM'));
  //console.log(await IndexUpdater.instance.getDestTrxData('0xb6faef548ca3712b1dceaa368b6474539f96fe44cc9b1ffbaf40d58c19cf4ab1', 'ETHEREUM', provider));



  /*let a = await new Web3(
    new Web3.providers.HttpProvider(getChain('4')?.node!, {
      timeout: 5000,
    })
  ).eth.getPastLogs({
    fromBlock: 18080582,
    toBlock: 18080582,
    address: '0x0b7ed039dff2b91eb4746830eadae6a0436fc4cb',
  });
  
  let b = await new Web3(
    new Web3.providers.HttpProvider(getChain('7')?.node!, {
      timeout: 5000,
    })
  ).eth.getPastLogs({
    fromBlock: 28723906,
    toBlock: 28723906,
    address: '0x2d317eD6C2e3EB5C54CA7518Ef19deEe96C15c85'
  });
  
  
  console.log(a);
  
  console.log(b);*/