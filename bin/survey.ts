#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SurveyStack } from "../lib/survey-stack";

const app = new cdk.App();
new SurveyStack(app, "SurveyStack", {
  env: {
    region: "eu-west-1"
  }
});