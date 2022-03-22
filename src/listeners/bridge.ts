
import { IEventRepo } from "../db/repo";
import { IContractEventListener } from "./web3";
import config from "../config";
import { io } from "socket.io-client";
import { io as clientAppSocket } from "../index";


const evmSocket = io(config.socketUrl);
const elrondSocket = io(config.elrond.socket);


export function BridgeEventService(eventRepo: IEventRepo): IContractEventListener {
    return {
      listen: () => {
        evmSocket.on(
          "tx_executed_event",
          async (
            toChain: number,
            fromChain: number,
            action_id: string,
            hash: string
          ) => {
            // chain is targetChain
            // action id is well, action id
            // hash is the transaction hash
  
            try {
              console.log(action_id, "id");
              console.log(fromChain, "toChain");
              const updated = await eventRepo.updateEvent(
                action_id,
                fromChain.toString(),
                toChain.toString(),
                hash
              );
              if (!updated) return;
              console.log(updated, "updated");
  
              clientAppSocket.emit("updateEvent", updated);
            } catch (e: any) {
              console.error(e);
            }
          }
        );


        elrondSocket.on(
            "elrond:bridge_tx",
            async (
              fromHash: string,
              sender: string,
              uris: string[],
              actionId: string
            ) => {
              try {
                console.log("elrond event incoming");
                const updated = await eventRepo.updateElrond(
                  actionId,
                  config.elrond.nonce,
                  fromHash,
                  sender,
                  uris[0]
                );
        
                console.log(updated, "updated");
        
                clientAppSocket.emit("updateEvent", updated);
              } catch (e: any) {
                console.error(e);
              }
            }
          );


      },
    };
  }