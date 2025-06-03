const { SendMessageCommand, SQSClient } = require("@aws-sdk/client-sqs");

const client = new SQSClient({});

exports.sendMessage = async (surveyResponse) => {
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
  const response = await client.send(command);
  console.log(`SQS response: ${JSON.stringify(response)}`);
}