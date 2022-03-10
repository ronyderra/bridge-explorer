import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectId } from "@mikro-orm/mongodb";

export interface IDailyData {
    txNumber: number,
    walletsNumber: number,
    date: string
}

@Entity()
export class DailyData {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  txNumber: number;

  @Property()
  walletsNumber: number

  @Property()
  date: string



  constructor(obj:IDailyData) {
      this.txNumber = obj.txNumber;
      this.walletsNumber = obj.walletsNumber;
      this.date = obj.date
  }

}