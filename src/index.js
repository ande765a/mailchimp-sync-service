const http = require("http");
const md5 = require("crypto").createHash("md5");
const { Mailchimp } = require("./mailchimp");
const { getSegmentedUsers } = require("./data");

const mailchimp = new Mailchimp({
  api_key: process.env.MAILCHIMP_API_KEY
});

switch (process.env.RUN_MODE) {
  case "job": {
    getSegmentedUsers()
      .then(users => {
        const automationListID = process.env.AUTOMATION_LIST_ID || "304e17e818";

        const batchOperations = users.map(user => {
          const emailHash = md5.update(user.email.toLowerCase()).digest("hex");
          return {
            method: "PUT",
            path: `lists/${automationListID}/members/${emailHash}`,
            body: JSON.stringify({
              email_address: user.email,
              status_if_new: "subscribed",
              // prettier-ignore
              interests: {
                [process.env.HOME_SUBSCRIPTION_STATUS_NOT_SUBSCRIBED]: !user.subscribed,
                [process.env.HOME_SUBSCRIPTION_STATUS_TRIAL]: false,
                [process.env.HOME_SUBSCRIPTION_STATUS_SUBSCRIBED]: user.subscribed,
                [process.env.HOME_SUBSCRIPTION_STATUS_CANCELLED]: user.cancelled,
                [process.env.HOME_SUBSCRIPTION_STATUS_ACTIVE]: user.active
              }
            })
          };
        });

        return mailchimp.fetch("batch", {
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

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
