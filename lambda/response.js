const { makeResponse } = require("./util");
const { validateParams } = require("./params");
const { getSurvey } = require("./db");

const { SendMessageCommand, SQSClient } = require("@aws-sdk/client-sqs");

const client = new SQSClient({});

exports.handler = async lambdaEvent => {
    try {
        const body = JSON.parse(lambdaEvent.body);
        const { id, pin } = validateParams(body);

        // Fetch survey data from db
        const qs = await getSurvey(id);
        if (!qs || pin != qs.pin) {
            throw new Error("Invalid params");
        }

        // TODO validate based on expected schema for survey?
        if (!body.response instanceof Object) {
            return makeResponse(400, `
                { 
                    "header": "Invalid response!",
                    "message": "That response didn't look right."
                }`,
                'application/json'
            );
        }
        
        const sqsMessage = JSON.stringify(body);
        console.log(`Writing message to SQS: ${sqsMessage}`);
        const command = new SendMessageCommand({
            QueueUrl: process.env.QUEUE_URL,
            MessageBody: sqsMessage
        });
        const response = await client.send(command);
        console.log(`SQS response: ${JSON.stringify(response)}`);

        return makeResponse(200, `
            { 
                "header": "Thanks for sharing!",
                "message": "Check out the aggregated response data <a href=\\"/prod/results?surveyId=${id}&pin=${pin}\\">here</a>."
            }`,
            'application/json'
        );
    } catch (e) {
        return makeResponse(401, `
            { 
                "header": "Unauthorised!",
                "message": "${e.message}"
            }`,
            'application/json'
        );
    }
}