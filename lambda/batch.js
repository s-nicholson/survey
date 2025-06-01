const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSurvey } = require("./lib/db");

const s3 = new S3Client();

exports.handler = async sqsEvent => {
    const messagesPerSurvey = {};
    // Group messages by survey ID
    sqsEvent.Records.forEach(msg => {
        const msgObj = JSON.parse(msg.body);
        const id = msgObj.surveyId;
        messagesPerSurvey[id] = messagesPerSurvey[id] || [];
        messagesPerSurvey[id].push(msgObj.response);
    });
    
    for (const [surveyId, msgList] of Object.entries(messagesPerSurvey)) {
        // Fetch survey from DB
        const qs = await getSurvey(surveyId);
        if (!qs) {
            console.error(`Unknown survey ID will be skipped: ${surveyId}`);
        } else {
            const responseFile = qs.filename;

            // Fetch from S3
            const originalResponseArray = await readResponses(qs.responseFile);
            
            // Append to list
            console.log(`Before: ${originalResponseArray.length}`);
            const newResponseArray = originalResponseArray.concat(msgList);
            console.log(`After: ${newResponseArray.length}`);
        
            // Write back to S3
            const writeResponse = await writeResponses(responseFile, newResponseArray);
            console.log(writeResponse);
        }
    }
};

async function readResponses(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.BUCKET,
            Key: key
        });
        const response = await s3.send(command);
        const responsBody = await response.Body.transformToString();
        return JSON.parse(responsBody);
    } catch (err) {
        return [];
    }
}

async function writeResponses(key, responses) {
    const command = new PutObjectCommand({
        Bucket: process.env.BUCKET,
        Key: key,
        Body: JSON.stringify(responses)
    });

    const response = await s3.send(command);
    return response;
}