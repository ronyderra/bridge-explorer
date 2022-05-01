import {
    MikroORM,
    IDatabaseDriver,
    Connection,
    wrap,
    QueryOrderKeys,
  } from "@mikro-orm/core";
  import {EthNftDto} from '../entities/NftIndex'
  import { BridgeEvent, IEvent } from "../entities/IEvent";
  import { IWallet, Wallet } from "../entities/IWallet";
  import { DailyData } from "../entities/IDailyData";
  import { chainNonceToName } from "../config";
  import moment from "moment";
  import axios from "axios";

  
  export interface IndexerRepo {
    findNFT({
        chainId,
        address,
        tokenId
    }:{
        chainId: string,
        address: string,
        tokenId?:string | undefined
    }): Promise<EthNftDto[] | null>;
    createNFT({
        ents
    }: {
        ents: EthNftDto[]
    }): Promise<void>
    removeNFT({
        ents
    }: {
        ents: EthNftDto[]
    }): Promise<void>
  }
  
  export default function createNFTRepo({
    em,
  }: MikroORM<IDatabaseDriver<Connection>>): IndexerRepo {
    return {
      async findNFT({chainId, address, tokenId}) {
        if (tokenId) {
          return await em.find(EthNftDto, { chainId, owner: address, tokenId });
        }
        return await em.find(EthNftDto, { chainId, owner: address });
      },
      async createNFT({ents}) {
        return await em.persistAndFlush(ents)
      },
      async removeNFT({ents}) {
          await em.removeAndFlush(ents)
      }

    };
  }
  