import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectId } from "@mikro-orm/mongodb";
export interface IEvent {
  chainName: string;
  type: "Transfer" | "Unfreeze";
  fromChain?: string;
  toChain?: string;
  fromChainName?: string;
  toChainName?: string;
  actionId: string;
  txFees: string;
  tokenId?: string;
  status: "Pending" | "Completed";
  fromHash: string;
  toHash?: string;
  senderAddress: string;
  targetAddress?: string;
  nftUri?: string;
}

@Entity()
export class BridgeEvent {
  @PrimaryKey()
  _id!: ObjectId;

  @Property({ nullable: true })
  chainName?: string;

  @Property({ nullable: true })
  type?: string;

  @Property({ nullable: true })
  fromChain?: string;

  @Property({ nullable: true })
  toChain?: string;

  @Property({ nullable: true })
  fromChainName?: string;

  @Property({ nullable: true })
  toChainName?: string;

  @Property({ nullable: true })
  actionId?: string;

  @Property({ nullable: true })
  txFees?: string;

  @Property({ nullable: true })
  tokenId?: string;

  @Property({ nullable: true })
  status?: string;

  @Property({ nullable: true })
  fromHash?: string;

  @Property({ nullable: true })
  toHash?: string;

  @Property({ nullable: true })
  targetAddress?: string;

  @Property({ nullable: true })
  senderAddress?: string;

  @Property({ nullable: true })
  nftUri?: string;

  @Property()
  createdAt: Date = new Date();

  constructor({
    actionId,
    chainName,
    fromHash,
    senderAddress,
    status,
    toChain,
    txFees,
    type,
    tokenId,
    fromChain,
    targetAddress,
    toHash,
    nftUri,
    fromChainName,
    toChainName,
  }: IEvent) {
    this.actionId = actionId;
    this.chainName = chainName;
    this.fromHash = fromHash;
    this.senderAddress = senderAddress;
    this.status = status;
    this.toChain = toChain;
    this.txFees = txFees;
    this.type = type;
    this.tokenId = tokenId;
    this.fromChain = fromChain;
    this.targetAddress = targetAddress;
    this.toHash = toHash;
    this.nftUri = nftUri;
    this.fromChainName = fromChainName;
    this.toChainName = toChainName;
  }
}
