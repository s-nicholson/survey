import { getSurvey } from  "./lib/db";
import { sendMessage } from  "./lib/queue";
import { makeResponse } from  "./lib/util";
import { SurveyAnswers, QuestionDefinition, SurveyResponse } from "./lib/types";

export const handler = async (lambdaEvent: any): Promise<any> => {
    try {
        const body: SurveyResponse = JSON.parse(lambdaEvent.body);
        const { surveyId, pin } = body;

        // Fetch survey data from db
        const surveyDefinition = await getSurvey(surveyId);
        if (!surveyDefinition || pin != surveyDefinition.pin) {
            throw new Error("Invalid survey id or pin");
        }

        // Validate based on expected schema for survey
        const error = validateResponse(surveyDefinition.questions, body.response);
        if (error) {
            return makeResponse(400,
                { 
                    "header": "Invalid response!",
                    "message": `That response didn't look right: ${error}`
                },
                'application/json'
            );
        }
        
        await sendMessage(body);

        const resultLink = `<a href="/prod/results?surveyId=${surveyId}&pin=${pin}">here</a>.`
        const message = `Check out the aggregated response data ${resultLink}` +
            "<br/>Responses are processed asynchronously, so it might take a few minutes for your answers to be included.";

        return makeResponse(200,
            { 
                "header": "Thanks for sharing!",
                "message": message
            },
            'application/json'
        );
    } catch (e: any) {
        return makeResponse(401,
            { 
                "header": "Unauthorised!",
                "message": e.message
            },
            'application/json'
        );
    }
}

function validateResponse(questions: QuestionDefinition[], answers: SurveyAnswers): string | void {
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