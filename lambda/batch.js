const { getSurvey } = require("./lib/db");
const { readResponseFile, writeResponseFile } = require("./lib/store");

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
        const surveyDefinition = await getSurvey(surveyId);
        if (!surveyDefinition) {
            console.error(`Unknown survey ID will be skipped: ${surveyId}`);
        } else {
            const responseFile = surveyDefinition.filename;

            // Fetch from S3
            const originalResponseArray = await readResponseFile(responseFile);
            
            // Append to list
            console.log(`Before: ${originalResponseArray.length}`);
            const newResponseArray = originalResponseArray.concat(msgList);
            console.log(`After: ${newResponseArray.length}`);
        
            // Write back to S3
            const writeResponse = await writeResponseFile(responseFile, newResponseArray);
            console.log(writeResponse);
        }
    }
};