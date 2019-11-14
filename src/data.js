const { MongoClient } = require("mongodb");
const { subDays } = require("date-fns");

async function getSegmentedUsers({ lookback_days = 14 } = {}) {
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
                  $and: [
                    { $ne: ["$period", 0] },
                    {
                      $eq: ["$customer", "$$customer_id"]
                    },
                    {
                      $lte: ["$startDate", new Date()]
                    }
                  ]
                }
              }
            },
            {
              $addFields: {
                active: {
                  $and: [
                    {
                      $lte: ["$startDate", new Date()]
                    },
                    {
                      $gte: ["$expirationDate", new Date()]
                    }
                  ]
                }
              }
            }
          ],
          as: "subscriptions"
        }
      },
      /*{
      $lookup: {
        from: "streamactivities",
        let: {
          user_id: "$_id"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$user", "$$user_id"]
                  },
                  {
                    $gte: ["$start", subDays(new Date(), lookback_days)]
                  }
                ]
              }
            }
          },
          {
            $lookup: {
              from: "streams",
              localField: "stream",
              foreignField: "_id",
              as: "stream"
            }
          },
          {
            $match: {
              // Only SubReader Home streams
              "stream.owner": { $exists: true }
            }
          },
          {
            $project: {
              start: "$start",
              duration: {
                $sum: {
                  $subtract: ["$end", "$start"]
                }
              }
            }
          }
        ],
        as: "streamactivities"
      }
    },*/
      {
        $project: {
          name: "$name",
          logins: "$logins",
          country: "$country",
          language: "$language",
          cancelled: {
            $anyElementTrue: "$subscriptions.cancelled"
          },
          subscribed: {
            $anyElementTrue: "$subscriptions"
          },
          active: {
            $anyElementTrue: "$subscriptions.active"
          }
          /*streamed: {
          $divide: [
            {
              $divide: [
                { $sum: "$streamactivities.duration" },
                lookback_days
              ]
            },
            60 * 1000 // Get in minutes
          ]
        }*/
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
