import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { SurveyResponse } from "./types";

const sqsClient = new SQSClient({});

export const sendMessage = async (surveyResponse: SurveyResponse): Promise<void> => {
  const responseDate = new Date().toJSON();
  const sqsMessage = JSON.stringify({
      ...surveyResponse,
      responseDate
  });
  console.log(`Writing message to SQS: ${sqsMessage}`);
  const command = new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: sqsMessage
  });
  const response = await sqsClient.send(command);
  console.log(`SQS response: ${JSON.stringify(response)}`);
}