import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectId } from "@mikro-orm/mongodb";
export interface ILastBlockScraped {
    blockChainNumber: number;
    blochChainSymbol: string;
    lastBlockScraped: number;
}

@Entity()
export class LastBlockScraped {

    @PrimaryKey()
    _id?: ObjectId;

    @Property({ nullable: true })
    blockChainNumber?: number;

    @Property()
    blochChainSymbol?: string;

    @Property()
    lastBlockScraped?: number;


    constructor({
        blockChainNumber,
        blochChainSymbol,
        lastBlockScraped,
    
    }: ILastBlockScraped) {
        this.blockChainNumber = blockChainNumber;
        this.blochChainSymbol = blochChainSymbol;
        this.lastBlockScraped = lastBlockScraped;
    }
}
