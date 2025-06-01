# Surveys

Simple config-driven survey app which generates a multi-choice questionnaire and then allows simple exploration of the results data using DC.js

## Config

Config is in DynamoDB in the form:
```json
{
  id: "surveyId",
  pin: "surveyPin",
  name: "Display Name",
  filename: "Key for results file on S3",
  questions: [
    {
      id: "questionId",
      label: "Question Label",
      options: [
        "A", "B", "C"
      ]
    },
    ...
  ]
}
```