import config from "../config";
const SibApiV3Sdk = require("sib-api-v3-sdk");
const moment = require("moment");
export class Mailer {
  sendFormFill = (body: any, title: string) => {
    return new Promise((res, rej) => {
      var defaultClient = SibApiV3Sdk.ApiClient.instance;

      var apiKey = defaultClient.authentications["api-key"];
      apiKey.apiKey = config.mail_key;
      var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

      var sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail = {
        to: [
          // {
          // email: "notifications@xp.network",
          // },
          {
            email: "michael@xp.network",
          },
          // {
          //     email: 'michael@xp.network',
          // },
          // {
          //     email: 'rubye@nonprofit.one'
          // }
        ],
        sender: {
          name: title,
          email: "notifier@xp.network",
        },
        headers: {
          "X-Mailin-custom":
            "custom_header_1:custom_value_1|custom_header_2:custom_value_2",
        },
        subject: `User filled ${title} on the XP.network website at ${moment()
          .add("H", 3)
          .format("DD/MM/YYYY HH:mm:ss")}`,
        htmlContent: `<html lang="HE">
        
                <head>
                </head>
                <style>
                    html {
                        direction: rtl;
                    }
                </style>
                
                <body>
                    ${Object.keys(body)
                      .map((n) => `<p>${n}: ${body[n]}</p>`)
                      .join("\n")}
                </body>
                
                </html>`,
      };

      apiInstance.sendTransacEmail(sendSmtpEmail).then(
        function (data: any) {
          res(true);
        },
        function (error: any) {
          console.log(error);
          rej();
        }
      );
    });
  };

  sendmailerror = (body: any, title: string) => {
    return new Promise((res, rej) => {
      var defaultClient = SibApiV3Sdk.ApiClient.instance;

      var apiKey = defaultClient.authentications["api-key"];
      apiKey.apiKey = process.env.SENDING_BLUE;
      var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

      var sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail = {
        to: [
          //     {
          //     email: 'notifications@xp.network',
          // },
          {
            email: "michael@xp.network",
          },
          // {
          //     email: 'michael@xp.network',
          // },
          {
            email: "rubye@nonprofit.one",
          },
        ],
        sender: {
          name: title,
          email: "notifier@xp.network",
        },
        headers: {
          "X-Mailin-custom":
            "custom_header_1:custom_value_1|custom_header_2:custom_value_2",
        },
        subject: `${title} ${moment()
          .add("H", 3)
          .format("DD/MM/YYYY HH:mm:ss")}`,
        htmlContent: `<html lang="HE">
        
                <head>
                </head>
                <style>
                    html {
                        direction: rtl;
                    }
                </style>
                
                <body>
                ${body}
                </body>
                
                </html>`,
      };

      apiInstance.sendTransacEmail(sendSmtpEmail).then(
        function (data: any) {
          res(true);
        },
        function (error: any) {
          console.log(error);
          rej();
        }
      );
    });
  };
}
