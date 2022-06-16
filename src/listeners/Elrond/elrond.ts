import { Base64 } from "js-base64";
import { IContractEventListener } from "../../Intrerfaces/IContractEventListener";
import config, { chainNonceToName, getTelegramTemplate } from "../../config";
import axios from "axios";
import { IERC721WrappedMeta } from "../../Intrerfaces/ERCMeta";
import { IEvent } from "../../Intrerfaces/IEvent";
import { io } from "socket.io-client";
import { clientAppSocket } from "../../index";
import {Address,ProxyProvider,} from "@elrondnetwork/erdjs";
import { IDatabaseDriver, Connection, EntityManager } from "@mikro-orm/core";
import createEventRepo from "../../business-logic/repo";
import { eventFromTxn, bigIntFromBeElrd, getFrozenTokenAttrs } from "./helper";
import { executedEventHandler } from "../../handlers";

const elegantPair = require('elegant-pair');
const util = require("util");

const elrondSocket = io(config.elrond.socket);
const executedSocket = io(config.socketUrl);

const provider = new ProxyProvider(config.elrond.node);

const providerRest = axios.create({ baseURL: config.elrond.api });
const minterAddr = new Address(config.elrond.contract);


// TODO: Save bridge events to db
export  function elrondEventListener(
  em: EntityManager<IDatabaseDriver<Connection>>,
): IContractEventListener {

  return {
    listen: async () => {
      elrondSocket.on("elrond:bridge_tx", async (fromHash: string) => {
        try {
          console.log(fromHash, "fromHash");
          const event = await eventFromTxn(fromHash, provider, providerRest);

          if (!event) return;

          event.evs.length &&
            event.evs.forEach(async (e) => {

              if (e.topics.length < 5) {
                return undefined;
              }
              if (e.address != config.elrond.contract) {
                return undefined;
              }

              const action_id = bigIntFromBeElrd(
                Base64.toUint8Array(e.topics[1])
              );
              const tx_fees = bigIntFromBeElrd(
                Base64.toUint8Array(e.topics[e.topics.length - 1])
              );

              console.log({
                action_id: action_id.toString(),
                tx_fees: tx_fees.toString(),
              });

              console.log(e.topics);
              const to = Base64.atob(e.topics[3]); //
              const nftMinterContact = Base64.decode(e.topics[4]); //
              let uri = "";
              let tokenId = "";
              let chain_nonce = new Uint32Array(
                Base64.toUint8Array(e.topics[2])
              )[0]; //
              const nonce = bigIntFromBeElrd(Base64.toUint8Array(e.topics[6]));

              console.log({
                chain_nonce,
                nftMinterContact,
                nonce,
              });

              let type = "Unfreeze";

              switch (e.identifier) {
                case "withdrawNft": {
                  type = "Unfreeze";

                  uri = Base64.decode(e.topics[5]); //
                  const wrappedData = await axios.get<IERC721WrappedMeta>(uri);
                  tokenId = wrappedData?.data?.wrapped?.tokenId;

                  break;
                }
                case "freezeSendNft": {
                  type = "Transfer";
                  tokenId = Base64.decode(e.topics[5]);

                  const name = Base64.decode(e.topics[7]);
                  uri = Base64.decode(e.topics[8]);
                  const [attrs, metadataUrl] = await getFrozenTokenAttrs(
                    tokenId,
                    nonce
                  );

                  console.log({
                    name,
                    metadataUrl,
                    attrs,
                  });
                  break;
                }
              }

              const eventObj: IEvent = {
                actionId: action_id?.toString(),
                chainName: "ELROND",
                tokenId,
                fromChain: "2",
                toChain: chain_nonce?.toString(),
                fromChainName: chainNonceToName("2"),
                toChainName: chainNonceToName(nonce?.toString()) || "",
                fromHash,
                txFees: tx_fees?.toString(),
                type,
                status: "Pending",
                toHash: "",
                senderAddress: event.sender,
                targetAddress: to,
                nftUri: uri || "",
                createdAt:  new Date()
              };

              console.log("transfer event: ", eventObj);

                            const [doc] = await Promise.all([
                                (async () => {
                                    return await createEventRepo(em.fork()).createEvent(eventObj);
                                })(),
                                (async () => { })(),
                            ])
                            if (doc) {
                                console.log("------TELEGRAM FUNCTION-----")
                                console.log("doc: ", doc);

                                setTimeout(() => clientAppSocket.emit("incomingEvent", doc), Math.random() * 3 * 1000)

                                setTimeout(async () => {
                                    const updated = await createEventRepo(em.fork()).errorEvent(fromHash);
                                    clientAppSocket.emit("updateEvent", updated);
                                    if (updated) {
                                        try {
                                            console.log("before telegram operation")
                                            axios.get(`https://api.telegram.org/bot5524815525:AAEEoaLVnMigELR-dl01hgHzwSkbonM1Cxc/sendMessage?chat_id=-553970779&text=${getTelegramTemplate(doc)}&parse_mode=HTML`);
                                        } catch (err) {
                                            console.log(err)
                                        }
                                    }
                                }, 1000 * 60 * 20);
                            }
                        });

      executedSocket.on("tx_executed_event",async (fromChain: number,toChain: number,action_id: string,hash: string) => {
          if (!fromChain || fromChain.toString() !== config.elrond.nonce)
            return;

          console.log({toChain,fromChain,action_id,hash,},"elrond:tx_executed_event");
          executedEventHandler(em.fork(), fromChain.toString())({toChain,fromChain,action_id,hash,})
        }
      );

      setTimeout(
        () => console.log(elrondSocket.connected && "Listening to Elrond"),
        1000
      );
    },
  };
}

export type Erc721Attrs = {
  trait_type: string;
  value: string;
};

