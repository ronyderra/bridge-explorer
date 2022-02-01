export interface IEvent {
  chainName: string;
  type: "Transfer" | "Unfreeze";
  fromChain?: string;
  toChain: string;
  actionId: string;
  txFees: string;
  eventId?: string;
}
