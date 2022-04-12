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
  import { ObjectId } from "bson";
  
  export interface IndexerRepo {
    findNFT({
        chainId,
        senderAddress
    }:{
        chainId: string,
        senderAddress: string
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
      async findNFT({chainId,senderAddress}) {
        return await em.find(EthNftDto, { chainId, owner: senderAddress });
      },
      async createNFT({ents}) {
        return await em.persistAndFlush(ents)
      },
      async removeNFT({ents}) {
          await em.removeAndFlush(ents)
      }

    };
  }
  