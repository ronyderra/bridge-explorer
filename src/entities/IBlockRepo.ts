import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectId } from "@mikro-orm/mongodb";

export interface IBlockRepo {
    chain: string,
    lastBlock: number,
    timestamp: number,
    addresses?: string[]
}

@Entity()
export class BlockRepo {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  chain: string;

  @Property()
  lastBlock: number

  @Property()
  timestamp: number

  @Property()
  addresses?: string[]

  constructor(obj:IBlockRepo) {
     this.chain = obj.chain
     this.lastBlock = obj.lastBlock
     this.timestamp = obj.timestamp
     if (obj.addresses){
       this.addresses = obj.addresses
     }
  }

}