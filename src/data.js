const { MongoClient } = require("mongodb");

async function getSegmentedUsers() {
  const client = await MongoClient.connect(
    // prettier-ignore
    `mongodb://${process.env.MONGODB_HOST || "mongo"}:${process.env.MONGODB_PORT || 27017}`,
    {
      useNewUrlParser: true
    }
  );
  const db = client.db("SubReader");

  const data = await db
    .collection("users")
    .aggregate([
      {
        $match: {
          "logins.type": "email"
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          let: {
            customer_id: "$_id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$customer", "$$customer_id"]
                }
              }
            }
          ],
          as: "subscriptions"
        }
      },
      {
        $project: {
          name: "$name",
          logins: "$logins",
          country: "$country",
          language: "$language",
          subscriptions: "$subscriptions"
        }
      }
    ])
    .toArray();

  client.close();

  return data;
}

module.exports = {
  getSegmentedUsers
};
