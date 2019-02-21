const http = require("http");
const crypto = require("crypto");
const { Mailchimp } = require("./mailchimp");
const { getSegmentedUsers } = require("./data");

const mailchimp = new Mailchimp({
  api_base: process.env.MAILCHIMP_BASE_URL,
  api_key: process.env.MAILCHIMP_API_KEY
});

switch (process.env.RUN_MODE) {
  case "job": {
    getSegmentedUsers()
      .then(users => {
        const batchOperations = users.map(user => {
          const emailHash = crypto
            .createHash("md5")
            .update(user.email.toLowerCase())
            .digest("hex");

          const [firstname, ...lastnames] = user.name.split(" ");

          return {
            method: "PUT",
            // prettier-ignore
            path: `lists/${process.env.AUTOMATION_LIST_ID}/members/${emailHash}`,
            body: JSON.stringify({
              email_address: user.email,
              status_if_new: "subscribed",
              // prettier-ignore
              interests: {
                [process.env.HOME_SUBSCRIPTION_STATUS_NOT_SUBSCRIBED]: !user.subscribed,
                [process.env.HOME_SUBSCRIPTION_STATUS_TRIAL]: false,
                [process.env.HOME_SUBSCRIPTION_STATUS_SUBSCRIBED]: user.subscribed,
                [process.env.HOME_SUBSCRIPTION_STATUS_CANCELLED]: user.cancelled,
                [process.env.HOME_SUBSCRIPTION_STATUS_ACTIVE]: user.active,
                [process.env.HOME_USAGE_NO_USAGE]: user.streamed <= 0,
                [process.env.HOME_USAGE_LOW_USAGE]: user.streamed > 0
              },
              merge_fields: {
                FNAME: firstname,
                LNAME: lastnames.join(" ")
              }
            })
          };
        });

        return mailchimp.fetch("batches", {
          // @ts-ignore
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            operations: batchOperations
          })
        });
      })
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
        //process.exit(0);
      })
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
    break;
  }
  default: {
    const server = http.createServer((req, res) => {
      getSegmentedUsers()
        .then(users => {
          res.write(JSON.stringify(users, null, 2));
          res.end();
        })
        .catch(error => {
          res.statusCode = 500;
          res.statusMessage = error.message;
          res.write(
            JSON.stringify({
              message: error.message,
              code: error.code
            })
          );
          res.end();
        });
    });

    const port = process.env.PORT;
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
