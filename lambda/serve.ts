import { getSurvey } from "./lib/db";
import { getResponseFileUrl } from "./lib/store";
import { makeResponse } from "./lib/util";
import { basicPage, questions, renderTemplate } from "./lib/ui";
import { QuestionDefinition, SurveyDefinition } from "./lib/types";

export const handler = async (lambdaEvent: any): Promise<any> => {
    try {
        const { surveyId, pin } = lambdaEvent.queryStringParameters;

        // Fetch survey data from db
        const surveyDefinition = await getSurvey(surveyId);
        if (!surveyDefinition || pin != surveyDefinition.pin) {
            throw new Error("Invalid survey id or pin");
        }

        switch (lambdaEvent.path) {
            case "/survey":
                return makeResponse(200, surveyContent(surveyDefinition));
            case "/results":
                const dataUrl = await getResponseFileUrl(surveyDefinition.filename);
                return makeResponse(200, resultsContent(surveyDefinition, dataUrl));
        }
    } catch (e: any) {
        return makeResponse(401, basicPage(`Error`, `
                <h1>Oops</h1>
                <p>${e.message}</p>
            `)
        );
    }
}

function surveyContent(surveyDefinition: SurveyDefinition) {
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

function resultsContent(surveyDefinition: SurveyDefinition, dataUrl: string) {
    const titleMap: { [key: string]: string } = {};
    surveyDefinition.questions.forEach((question: QuestionDefinition) => {
        titleMap[question.id] = question.label;
    });

    return renderTemplate("results", {
        titleMap: JSON.stringify(titleMap),
        dataUrl,
        name: surveyDefinition.name,
        description: surveyDefinition.description,
    });
}