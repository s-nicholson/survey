export type QuestionDefinition = {
  id: string,
  label: string,
  options: string[],
  defaultVal?: string,
  order?: number,
};

export type SurveyDefinition = {
  id: string,
  pin: string,
  filename: string,
  questions: QuestionDefinition[],
  name: string,
  description: string,
  resultsDescription: string,
};

export type SurveyAnswers = {
  [key: string]: string
};

export type SurveyResponse = {
  surveyId: string,
  pin: string,
  response: SurveyAnswers
}