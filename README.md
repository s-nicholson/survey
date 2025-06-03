# Surveys

Simple config-driven survey app which generates a multi-choice questionnaire and then allows simple exploration of the results data using DC.js

I wanted to figure out if we can easily build an alternative to a SaaS survey platform for this, the things I wanted from the solution were:

* keep control of response data,
* allow anonymous responses,
  * but still at least prevent *anyone* from responding,
* allow anyone who contributes to see the results.

> This is a very MVP solution, I've cut a pile of corners, but it seems to hang together.

## Design

The app uses serverless components to collect survey responses, persist them, and display the results:

* Survey is served via the `serve` lambda - this looks up the survey config in DynamoDB and renders the form.
* Answers are posted from client-side JS to the `response` lambda - this writes response data to SQS.
* Messages from SQS are consumed by the `batch` lambda - this reads the current response data file from S3, appends the new messages, and writes the data back to S3.
* Results page is served via the `serve` lambda - this creates a presigned URL for the results data file, and builds it into the returned HTML page.
  * This page loads the results data into DC.js and renders charts for exploration.

### Config

Config is in DynamoDB in the form:
```js
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
      ],
      defaultVal: "A" // optional,
      order: 1 // optional
    },
    ...
  ]
}
```
