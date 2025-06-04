import { LambdaIntegration, RestApi, Model, JsonSchemaType, RequestValidator } from "aws-cdk-lib/aws-apigateway";
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
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

    this.apigateway(serveFn, responseFn);
  }

  private apigateway(serveFn: Function, responseFn: Function) {
    const api = new RestApi(this, "SurveyApi", {
      restApiName: "Survey Service",
    });

    // Model for POST body validation
    const postModel = new Model(this, 'PostRequestModel', {
      restApi: api,
      contentType: 'application/json',
      modelName: 'PostRequest',
      schema: {
        type: JsonSchemaType.OBJECT,
        required: ['surveyId', 'pin', 'response'],
        properties: {
          surveyId: { type: JsonSchemaType.STRING },
          pin: { type: JsonSchemaType.STRING },
          response: { 
            type: JsonSchemaType.OBJECT,
            additionalProperties: { type: JsonSchemaType.STRING }
          }
        },
        additionalProperties: false,
      },
    });

    // Validator for POST
    const postValidator = new RequestValidator(this, 'PostValidator', {
      restApi: api,
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    const response = api.root.addResource("response");
    response.addMethod("POST", new LambdaIntegration(responseFn), {
      requestValidator: postValidator,
      requestModels: { 'application/json': postModel },
    });

    // Validator for GET query params
    const getOptions = {
      requestValidator: new RequestValidator(this, 'GetValidator', {
        restApi: api,
        validateRequestParameters: true,
        validateRequestBody: false,
      }),
      requestParameters: {
        'method.request.querystring.surveyId': true,
        'method.request.querystring.pin': true,
      },
    }
    const survey = api.root.addResource("survey");
    survey.addMethod("GET", new LambdaIntegration(serveFn), getOptions);
    const results = api.root.addResource("results");
    results.addMethod("GET", new LambdaIntegration(serveFn), getOptions);

    // Attach WAF to API Gateway stage
    const waf = this.waf();
    new CfnWebACLAssociation(this, 'WebAclAssoc', {
      resourceArn: `arn:aws:apigateway:eu-west-1::/restapis/${api.restApiId}/stages/${api.deploymentStage.stageName}`,
      webAclArn: waf.attrArn,
    });
  }

  private waf(): CfnWebACL {
    return new CfnWebACL(this, 'WebAcl', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'rateLimitWaf',
        sampledRequestsEnabled: true,
      },
      name: 'RateLimitAcl',
      rules: [
        {
          name: 'RateLimitPerIP',
          priority: 0,
          action: { challenge: {} },
          statement: {
            rateBasedStatement: {
              limit: 100,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'rateLimitRule',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
  }
}
