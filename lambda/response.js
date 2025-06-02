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
        const surveyDefinition = await getSurvey(id);
        if (!surveyDefinition || pin != surveyDefinition.pin) {
            throw new Error("Invalid params");
        }

        // Validate based on expected schema for survey
        const error = validateResponse(surveyDefinition.questions, body.response);
        if (error) {
            return makeResponse(400, `
                { 
                    "header": "Invalid response!",
                    "message": "That response didn't look right: ${error}"
                }`,
                'application/json'
            );
        }
        
        await sendtoSqs(body);

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

function validateResponse(questions, answers) {
    const numAnswers = Object.keys(answers).length;
    if (numAnswers != questions.length) {
        return "Wrong number of answers";
    }
    for (const [qId, answer] of Object.entries(answers)) {
        let found = false;
        for (const q of questions) {
            if (q.id == qId) {
                found = true;
                if (!q.options.includes(answer)) {
                    return "Invalid answer to question";
                }
            }
        }
        if (!found) {
            return "Answer to a question we didn't ask";
        }
    }
}

async function sendtoSqs(surveyResponse) {
    const submissionDate = new Date().toJSON();
    const sqsMessage = JSON.stringify({
        ...surveyResponse,
        submissionDate
    });
    console.log(`Writing message to SQS: ${sqsMessage}`);
    const command = new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: sqsMessage
    });
    const response = await client.send(command);
    console.log(`SQS response: ${JSON.stringify(response)}`);
}