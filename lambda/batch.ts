import { getSurvey } from "./lib/db";
import { readResponseFile, writeResponseFile } from "./lib/store";
import { SurveyResponse } from "./lib/types";

type ResponseMap = {
    [surveyId: string]: SurveyResponse[]
};
export const handler = async (sqsEvent: any): Promise<any> => {
    const messagesPerSurvey: ResponseMap = {};
    // Group messages by survey ID
    sqsEvent.Records.forEach((msg: any) => {
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