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
  apiKey: "API_KEY"
});

function createUserPostData(user) {
  const { email } = user.logins.find(login => login.type == "email");

  const [firstname, ...lastnames] = user.name.split(" ");

  return {
    FirstName: firstname,
    LastName: lastnames.join(" "),
    Email: email,
    custom: {
      // We default to DA-dk as that is what api-service does
      "string--Country--code": user.country || "DA",
      "string--Language--code": user.language || "dk",
      "boolean--Ever--subscribed": user.subscribed,
      "boolean--Active--subscribtion": user.active
      // "boolean--Ever--used--trial": false,
      // "boolean--Using--trial": false
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
        console.log(userPostData);

        console.log(
          JSON.stringify({
            contacts: userPostData
          })
        );

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
        .then(users => users.map(createBatchOperationFromUser))
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
