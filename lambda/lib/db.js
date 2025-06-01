const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

// DDB lookup
exports.getSurvey = async (id) => {
  const response = await dynamo.send(
    new GetCommand({
      TableName: process.env.TABLE,
      Key: {
        id: id,
      },
    })
  )
  return response.Item;
};