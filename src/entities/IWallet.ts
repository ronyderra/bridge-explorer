import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectId } from "@mikro-orm/mongodb";

export interface IWallet {
    address: string;
}

@Entity()
export class Wallet {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  address: string;


  constructor(obj:IWallet) {
      this.address = obj.address;
  }

}