const { makeResponse } = require("./lib/util");
const { validateParams } = require("./lib/params");
const { getSurvey } = require("./lib/db");

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

        const resultLink = `<a href=\\"/prod/results?surveyId=${id}&pin=${pin}\\">here</a>.`
        const message = `Check out the aggregated response data ${resultLink}` +
            "<br/>Responses are processed asynchronously, so it might take a few minutes for your answers to be included.";

        return makeResponse(200, `
            { 
                "header": "Thanks for sharing!",
                "message": "${message}"
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