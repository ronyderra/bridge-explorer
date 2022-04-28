import {
    MikroORM,
    IDatabaseDriver,
    Connection,
  } from "@mikro-orm/core";
  import {EthNftDto} from '../entities/NftIndex'

  
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
  