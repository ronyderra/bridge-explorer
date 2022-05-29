const moment = require("moment");
import CONFIG from "../config";
const { GoogleSpreadsheet } = require("google-spreadsheet");

const {
  type,
  project_id,
  private_key,
  private_key_id,
  client_email,
  client_id,
  client_x509_cert_url,
  auth_provider_x509_cert_url,
  auth_uri,
  token_uri,
} = CONFIG;

export default async function (body: {
  txHash: string;
  depChain: string;
  destChain: string;
}) {
  const { txHash, depChain, destChain } = body;
  try {
    const creds = {
      type,
      project_id,
      private_key_id,
      private_key,
      client_email,
      client_id,
      auth_uri,
      token_uri,
      auth_provider_x509_cert_url,
      client_x509_cert_url,
    }; // the file saved above

    const doc = new GoogleSpreadsheet(
      "11ZUas1GydEycqFYPtzRyacMxLpUZiQwloNVviqnQcOQ"
    );

    try {
      await doc.useServiceAccountAuth(creds);
      try {
        await doc.loadInfo();

        const sheet = doc.sheetsByTitle["TX Explorer"];
        try {
          sheet.addRow({
            "Tx Hash": txHash,
            "Departure Chain": depChain,
            "Destination Chain": destChain,
            "Submitted At": String(moment().add(2, "hours").format("DD/MM/YYYY HH:mm:ss")),
          });
        } catch (err) {
          console.log(err);
        }
      } catch (err) {
        console.log(err);
      }
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
}
