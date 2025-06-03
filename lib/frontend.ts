import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export type FrontendProps = {
  table: TableV2,
  bucket: Bucket,
  queue: Queue
}

export class Frontend extends Construct {
  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    // Lambda to serve the frontend pages
    const serveFn = new NodejsFunction(this, "Serve", {
      bundling: {
        commandHooks: {
          afterBundling: (inputDir: string, outputDir: string): string[] => [
            `cp -R ${inputDir}/lambda/templates ${outputDir}`,
          ],
          beforeBundling: (_inputDir: string, _outputDir: string): string[] => [],
          beforeInstall: (_inputDir: string, _outputDir: string): string[] => [],
        },
      },
      runtime: Runtime.NODEJS_20_X,
      entry: "lambda/serve.js",
      environment: {
        BUCKET: props.bucket.bucketName,
        TABLE: props.table.tableName
      }
    });

    props.table.grantReadData(serveFn);
    props.bucket.grantRead(serveFn);

    // Lambda to send responses to SQS
    const responseFn = new NodejsFunction(this, "Response", {
      runtime: Runtime.NODEJS_20_X,
      entry: "lambda/response.js",
      environment: {
        QUEUE_URL: props.queue.queueUrl,
        TABLE: props.table.tableName
      }
    });

    props.table.grantReadData(responseFn);
    props.queue.grantSendMessages(responseFn);

    // API GW to expose lambdas
    const api = new RestApi(this, "SurveyApi", {
      restApiName: "Survey Service",
    });
    const survey = api.root.addResource("survey");
    survey.addMethod("GET", new LambdaIntegration(serveFn));
    const results = api.root.addResource("results");
    results.addMethod("GET", new LambdaIntegration(serveFn));

    const response = api.root.addResource("response");
    response.addMethod("POST", new LambdaIntegration(responseFn));
  }
}