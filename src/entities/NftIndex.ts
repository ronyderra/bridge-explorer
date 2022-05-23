import { Entity, Index, PrimaryKey, Property, Unique } from "@mikro-orm/core"
import { ObjectId } from "@mikro-orm/mongodb"

@Entity()
@Index({ properties: ["chainId", "owner"] })
@Unique({ properties: ["chainId", "tokenId", "contract"] })
export class EthNftDto {
    @PrimaryKey()
    _id!: ObjectId

    @Property()
    chainId: string

    @Property()
    tokenId: string

    @Property()
    owner: string

    @Property()
    uri?: string

    @Property()
    name?: string

    @Property()
    symbol?: string

    @Property()
    contract: string

    @Property()
    contractType?: "ERC1155" | "ERC721"

    @Property({ onUpdate: () => new Date(), onCreate: () => new Date() })
    updatedAt!: Date

    constructor(
        chainId: bigint,
        tokenId: bigint,
        owner: string,
        contract: string,
        contractType: "ERC1155" | "ERC721",
        uri?: string,
        name?: string,
        symbol?: string
    ) {
        this.chainId = chainId.toString()
        this.tokenId = tokenId.toString()
        this.owner = owner
        this.uri = uri
        this.contract = contract
        this.contractType = contractType
        this.name = name
        this.symbol = symbol
    }
}
