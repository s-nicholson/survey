import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as Survey from "../lib/survey-stack";

test("Stack Created", () => {
  const app = new cdk.App();
  const stack = new Survey.SurveyStack(app, "MyTestStack", {
    env: {
      region: "eu-west-1"
    }
  });
  const template = Template.fromStack(stack);

  // TODO improve assertions
  template.resourceCountIs("AWS::Lambda::Function", 3);
  template.resourceCountIs("AWS::DynamoDB::GlobalTable", 1);
  template.resourceCountIs("AWS::SQS::Queue", 1);
  template.resourceCountIs("AWS::S3::Bucket", 1);
});
