import { Entity, PrimaryKey, Property } from "@mikro-orm/core"
import { ObjectId } from "@mikro-orm/mongodb"

export interface IDailyData {
    txNumber: number,
    //exchangeRates: {
    //  [x:string]: string
    //},
    walletsNumber: number,
    date: string

}

@Entity()
export class DailyData {
  @PrimaryKey()
  _id!: ObjectId

  @Property()
  txNumber: number

 // @Property()
  //exchangeRates: {
   // [coin:string]: string
  //};

  @Property()
  walletsNumber: number

  @Property()
  date: string



  constructor(obj:IDailyData) {
      this.txNumber = obj.txNumber
      //this.exchangeRates = obj.exchangeRates;
      this.walletsNumber = obj.walletsNumber
      this.date = obj.date
  }

}