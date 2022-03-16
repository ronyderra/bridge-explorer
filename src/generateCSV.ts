import fs from "fs";

import { stringify } from "csv-stringify/sync";
import { IEventRepo } from "./db/repo";

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

  const csv = stringify(events, {
    header: true,
  });
  fs.writeFileSync("events.csv", csv);
};
