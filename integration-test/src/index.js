const fetch = require("node-fetch");

// @ts-ignore
fetch("http://mailchimp-sync-service/")
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
    console.log("Passed.");
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
