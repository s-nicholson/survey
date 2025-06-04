import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SurveyDefinition } from "./types";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// DDB lookup
export const getSurvey = async (id: string): Promise<SurveyDefinition> => {
  const response = await dynamo.send(
    new GetCommand({
      TableName: process.env.TABLE,
      Key: {
        id: id,
      },
    })
  )
  return response.Item as SurveyDefinition;
};