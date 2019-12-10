const http = require("http");
const { Autopilot } = require("./autopilot");
const { getSegmentedUsers } = require("./data");

// Async sleep function
function sleep(ms) {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, ms);
  });
}

const autopilot = new Autopilot({
  apiKey: process.env.AUTOPILOT_API_KEY
});

function createUserPostData(user) {
  const { email } = user.logins.find(login => login.type == "email");

  const subscriptions = user.subscriptions.filter(sub => !sub.trial);

  const trial = user.subscriptions.find(sub => {
    return sub.trial;
  });

  const subscription = subscriptions.slice(-1)[0]; // Latest subscription

  const [firstname, ...lastnames] = user.name ? user.name.split(" ") : [];

  return {
    FirstName: firstname,
    LastName: lastnames.join(" "),
    Email: email,
    custom: {
      "string--Language--code": user.language || "da",
      "string--Country--code": user.country || "DK",
      "date--User--created": user.createdAt,
      "date--Trial--started": trial && trial.startDate,
      "boolean--Has--chosen":
        user.settings && user.settings.hasSeenTrialExpirationPrompt,
      "date--Subscription--started": subscription && subscription.startDate,
      "boolean--Subscription--cancelled":
        subscription && subscription.cancelled,
      "date--Subscription--expired":
        subscription && subscription.expirationDate,
      "integer--Subscription--period": subscription && subscription.period,
      "integer--Subscriptions": subscriptions.length
    }
  };
}

switch (process.env.RUN_MODE) {
  case "job": {
    (async function() {
      const users = await getSegmentedUsers();

      // Split users into 100 long batches as Autopilot only allows up to 100.
      let batchSize = 10;
      for (var i = 0; i < users.length; i += batchSize) {
        // If we insert a max value that is out of bounds javascript simply returns
        // the rest of the array, which is the behavior we want
        const batch = users.slice(i, i + batchSize);

        const userPostData = batch.map(createUserPostData);

        const res = await autopilot.fetch("contacts", {
          method: "POST",
          body: JSON.stringify({
            contacts: userPostData
          })
        });

        // Print result
        console.log(JSON.stringify(res, null, 2));

        // Autopilot ratelimits us to 20 requests per second, so we make sure to
        // wait a bit over 50 ms between every request.
        await sleep(60); // 60 ms
      }
    })().catch(error => {
      console.error(error);
      process.exit(1);
    });
    break;
  }
  default: {
    const server = http.createServer((req, res) => {
      getSegmentedUsers()
        .then(users => users.map(createUserPostData))
        .then(batchOperations => {
          res.write(JSON.stringify(batchOperations, null, 2));
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
