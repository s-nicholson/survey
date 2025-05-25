import * as cdk from "aws-cdk-lib";
import { RemovalPolicy } from "aws-cdk-lib";
import { Key } from "aws-cdk-lib/aws-kms";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { AttributeType, TableEncryptionV2, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { Frontend } from "./frontend";
import { Backend } from "./backend";

export class SurveyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const key = new Key(this, "Key", {
      removalPolicy: RemovalPolicy.DESTROY
    });

    // DDB for survey data
    const table = new TableV2(this, "Table", {
      tableName: "Surveys",
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      encryption: TableEncryptionV2.customerManagedKey(key)
    });
    

    // S3 for batched data
    const bucket = new Bucket(this, "Store", {
      encryptionKey: key,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY
    });
    bucket.addCorsRule({
      allowedMethods: [HttpMethods.GET],
      allowedOrigins: ["*"],
      allowedHeaders: ["*"]
    });

    // SQS for responses
    const queue = new Queue(this, "Queue", {
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: key,
      removalPolicy: RemovalPolicy.DESTROY
    });

    new Frontend(this, "Frontend", {
      table,
      bucket,
      queue
    });
    new Backend(this, "Backend", {
      table,
      bucket,
      queue
    });
  }
}
