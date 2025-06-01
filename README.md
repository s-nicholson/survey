# Surveys

Simple config-driven survey app which generates a multi-choice questionnaire and then allows simple exploration of the results data using DC.js

## Architecture

The app uses serverless components to collect survey responses, persist them, and display the results:

* Survey is served via the `serve` lambda - this looks up the survey config in DynamoDB and renders the form.
* Answers are posted from client-side JS to the `response` lambda - this writes response data to SQS.
* Messages from SQS are consumed by the `batch` lambda - this reads the current response data file from S3, appends the new messages, and writes the data back to S3.
* Results page is served via the `serve` lambda - this creates a presigned URL for the results data file, and builds it into the returned HTML page.
  * This page loads the results data into DC.js and renders charts for exploration.

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