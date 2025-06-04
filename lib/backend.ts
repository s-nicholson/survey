import { Bucket } from "aws-cdk-lib/aws-s3";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Duration } from "aws-cdk-lib";
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export type BackendProps = {
  table: TableV2,
  bucket: Bucket,
  queue: Queue
}

export class Backend extends Construct {
  constructor(scope: Construct, id: string, props: BackendProps) {
    super(scope, id);

    // Lambda to offload SQS responses to S3
    const batchFn = new NodejsFunction(this, "Batch", {
      runtime: Runtime.NODEJS_20_X,
      entry: "lambda/batch.ts",
      reservedConcurrentExecutions: 1,
      environment: {
        BUCKET: props.bucket.bucketName,
        TABLE: props.table.tableName
      }
    });
    
    props.bucket.grantReadWrite(batchFn);
    props.table.grantReadData(batchFn);
    
    batchFn.addEventSource(new SqsEventSource(props.queue, {
      maxBatchingWindow: Duration.minutes(5)
    }));
  }
}