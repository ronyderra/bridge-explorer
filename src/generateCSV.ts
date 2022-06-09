import fs from "fs";
import { stringify } from "csv-stringify/sync";
import { IEventRepo } from "./business-logic/repo";
import moment from "moment";
import { ethers } from "ethers";
import { currency, txExplorers, addressExplorers } from "./config";
import { isBigNumberish } from "./business-logic/helpers";

export const generateCSV = async (
  eventRepo: IEventRepo,
  startDate?: string,
  endDate?: string,
  searchQuery?: string
) => {
  const events = await eventRepo.getEventsForCSV(
    startDate,
    endDate,
    searchQuery
  );

  const formatedEvents:any = events.map(event => {
      const shallow:any = {...event};
      delete shallow._id;
      delete shallow.fromChain;
      delete shallow.toChain;
      delete shallow.chainName;
      delete shallow.actionId;

      shallow['txValue'] = event.txFees  && isBigNumberish(event.txFees) &&  ethers.utils.formatEther(event.txFees) + ' ' +currency[event.fromChain || 'unknown_chain'];
      shallow['txDollarValue'] = event.dollarFees  && event.dollarFees
      shallow['fromHash'] = event.fromChain? `${txExplorers[event.fromChain]}${shallow['fromHash']}` : shallow['fromHash'] || '';
      shallow['toHash'] = event.toChain? `${txExplorers[event.toChain]}${shallow['toHash']}` : shallow['toHash'] || '';
      shallow['targetAddress'] = event.fromChain? `${addressExplorers[event.fromChain]}${shallow['targetAddress']}` : shallow['targetAddress'] || '';
      shallow['senderAddress'] = event.toChain? `${addressExplorers[event.toChain]}${shallow['senderAddress']}` : shallow['senderAddress'] || '';
      shallow['createdAt'] = String(moment(+shallow['createdAt']).format('MMMM Do YYYY, h:mm:ss a'))
      
      delete shallow.txFees;

      return shallow;
  })

  const csv = stringify(formatedEvents, {
    header: true,
  });
  fs.writeFileSync("events.csv", csv);
};
