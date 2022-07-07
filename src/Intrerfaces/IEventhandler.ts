export interface IEventhandler {
    actionId: string;
    from: string;
    to: string;
    sender: string;
    target: string;
    hash: string;
    tokenId: string;
    type: "Transfer" | "Unfreeze";
    txFees: string;
    uri: string;
    contract: string;
    dollarFees?: string;
    createdAt?: Date
    collectionName?: string
  }