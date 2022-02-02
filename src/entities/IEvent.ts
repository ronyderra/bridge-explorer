export interface IEvent {
  chainName: string;
  type: "Transfer" | "Unfreeze";
  fromChain?: string;
  toChain: string;
  actionId: string;
  txFees: string;
  eventId?: string;
  status: "pending" | "success";
  fromHash: string;
  toHash?: string;
  senderAddress: string;
  targetAddress?: string;
}
