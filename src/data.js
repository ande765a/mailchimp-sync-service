const { MongoClient } = require("mongodb");
const { subDays } = require("date-fns");

function getSegmentedUsers({ lookback_days = 14 } = {}) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(
      `mongodb://${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT ||
        27017}`,
      {
        useNewUrlParser: true
      }
    )
      .then(client => {
        const db = client.db("SubReader");

        db.collection("users")
          .aggregate([
            {
              $match: {}
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
            {
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
            },
            {
              $project: {
                name: "$name",
                email: "$email",
                cancelled: {
                  $anyElementTrue: "$subscriptions.cancelled"
                },
                subscribed: {
                  $anyElementTrue: "$subscriptions"
                },
                active: {
                  $anyElementTrue: "$subscriptions.active"
                },
                streamed: {
                  $divide: [
                    {
                      $divide: [
                        { $sum: "$streamactivities.duration" },
                        lookback_days
                      ]
                    },
                    60 * 1000 // Get in minutes
                  ]
                }
              }
            }
          ])
          .toArray()
          .then(data => {
            client.close();
            resolve(data);
          });
      })
      .catch(reject);
  });
}

module.exports = {
  getSegmentedUsers
};
