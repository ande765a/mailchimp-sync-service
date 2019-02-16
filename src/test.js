//@ts-nocheck
const { Mailchimp } = require("./mailchimp");
const crypto = require("crypto");

const mailchimp = new Mailchimp({
  api_key: "50690097c85eb02aa7f5b29a469e625b-us14"
});
const SUBSCRIPTION_STATUS_ID = "46dc26276f";

(async function() {
  try {
    const interests = await mailchimp.fetch(
      "lists/304e17e818/interest-categories/46dc26276f/interests"
    );
    console.log(interests);

    /*const result = await mailchimp.fetch("batches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operations: [
          {
            method: "POST",
            path: "lists/304e17e818/members",
            body: JSON.stringify({
              email_address: "alexander@subreader.dk",
              status: "subscribed"
            })
          }
        ]
      })
    });*/

    /*
      This one is the one I would like to use, since it will update the information
      for the subscriber, if they are already added to the list. If not, it will create the subscriber.
    */
    const result = await mailchimp.fetch(
      `lists/304e17e818/members/${crypto
        .createHash("md5")
        .update("kontakt@subreader.dk")
        .digest("hex")}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email_address: "kontakt@subreader.dk",
          status_if_new: "subscribed",
          interests: {
            "01c8a5c84b": true,
            "3ecb3832e7": false
          }
        })
      }
    );
    console.log(result);
  } catch (error) {
    console.error(error);
  }
})();
