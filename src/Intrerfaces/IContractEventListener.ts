export interface IContractEventListener {
  listen(): void;
  listenBridge?: FunctionStringCallback;
}