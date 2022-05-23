import axios, { AxiosInstance } from "axios"
import { providers , ethers } from "ethers"
import { Minter__factory, UserNftMinter__factory } from "xpnet-web3-contracts"

import { io } from "socket.io-client"

import BigNumber from "bignumber.js"

import config, { chainNonceToName , ChainConfig } from "../config"
import { IEventRepo } from "../db/repo"
import { IERC721WrappedMeta } from "../entities/ERCMeta"
import { IEvent } from "../entities/IEvent"
import { io as clientAppSocket } from "../index"
//import PromiseFulfilledResult from 'express'
import { saveWallet } from "../db/helpers"




import { handleBridgeEvent, handleNativeTransferEvent, handleNativeUnfreezeEvent } from "./helpers/evm"
import { eventHandler } from "./helpers/index"


const util = require('util')

export interface IContractEventListener {
  listen(): void;
}

const evmSocket = io(config.socketUrl)

export function nativeEvmListener(
  chain: ChainConfig,
  eventRepo: IEventRepo
): IContractEventListener {
  return {
    listen: () => {
      const provider =  new providers.JsonRpcProvider(chain.node)
      const contract = Minter__factory.connect(chain.contract, provider)

      const transferEvent = contract.filters.TransferErc721()
      const unfreezeEvent = contract.filters.UnfreezeNft()



      contract.on(
        transferEvent,
        async (
          actionId,
          targetNonce,
          txFees,
          to,
          tokenId,
          contract,
          tokenData,
          mintWith,
          event
        ) => {

          console.log({
            actionId,
            targetNonce,
            txFees,
            to,
            tokenId,
            contract,
            tokenData,
            mintWith,
          })

          const eventData = await handleNativeTransferEvent(chain.nonce, provider)({
            actionId,
            targetNonce,
            txFees,
            to,
            tokenId,
            contract,
            tokenData,
            mintWith,
            event
          })

          eventData && (await eventHandler(eventRepo)(eventData))

        }
      )

      // NOTE: will work when the only when the new bridge is used


      contract.on(
        unfreezeEvent,
        async (
          actionId,
          _,
          txFees,
          target,
          burner,
          tokenId,
          baseUri,
          event
        ) => {


          const eventData = await handleNativeUnfreezeEvent(chain.nonce, provider)({
            actionId,
            _,
            txFees,
            target,
            burner,
            tokenId,
            baseUri,
            event
          })

          eventData && (await eventHandler(eventRepo)(eventData))

        }
      )
    },
  }
}
