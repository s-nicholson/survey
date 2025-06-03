const { makeResponse, validateParams } = require("./lib/util");
const { basicPage, questions, renderTemplate } = require("./lib/ui");
const { getSurvey } = require("./lib/db");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client();

exports.handler = async lambdaEvent => {
    try {
        const { id, pin } = validateParams(lambdaEvent.queryStringParameters);

        // Fetch survey data from db
        const surveyDefinition = await getSurvey(id);
        if (!surveyDefinition || pin != surveyDefinition.pin) {
            throw new Error("Invalid survey id or pin");
        }

        switch (lambdaEvent.path) {
            case "/survey":
                return makeResponse(200, surveyContent(surveyDefinition));
            case "/results":
                const dataUrl = await getS3Url(surveyDefinition.filename);
                return makeResponse(200, resultsContent(surveyDefinition, dataUrl));
        }
    } catch (e) {
        return makeResponse(401, basicPage(`Error`, `
                <h1>Oops</h1>
                <p>${e.message}</p>
            `)
        );
    }
}

function surveyContent(surveyDefinition) {
    return basicPage(surveyDefinition.name, 
        renderTemplate("survey", {
            id: surveyDefinition.id,
            pin: surveyDefinition.pin,
            name: surveyDefinition.name,
            description: surveyDefinition.description,
            questions: questions(surveyDefinition.questions)
        })
    );
}

function resultsContent(surveyDefinition, dataUrl) {
    const titleMap = {};
    surveyDefinition.questions.forEach(question => {
        titleMap[question.id] = question.label;
    });

    return renderTemplate("results", {
        titleMap: JSON.stringify(titleMap),
        dataUrl,
        name: surveyDefinition.name,
        description: surveyDefinition.description,
    });
}

async function getS3Url(filename) {
    const expiresInSeconds = 60 * 5; // e.g., 5 minutes

    const command = new GetObjectCommand({
        Bucket: process.env.BUCKET,
        Key: filename
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    return signedUrl;
};