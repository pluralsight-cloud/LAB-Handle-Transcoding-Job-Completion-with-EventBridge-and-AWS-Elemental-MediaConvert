import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface EventsProps {
  sourceBucket: s3.IBucket;
  destBucket: s3.IBucket;
  function: lambda.IFunction;
  projectTag?: string;
}

export class VideoUploadRule extends Construct {
  readonly videoUploadDlq: sqs.Queue;  
  readonly videoUploadRule: events.Rule;

  constructor(scope: Construct, id: string, props: EventsProps) {
    super(scope, id);
    
    // Define variables
    const tag = props.projectTag ?? 'videotranscode';

    // Create dead letter SQS queue to store failures
    this.videoUploadDlq = new sqs.Queue(this, 'SourceRuleDLQ', {
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });
    cdk.Tags.of(this.videoUploadDlq).add('project', tag);

    // Create EventBridge rule
    this.videoUploadRule = new events.Rule(this, 'VideoUploadRule', {
      description: 'Trigger processor Lambda when a new .mp4 object is uploaded to the source bucket',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: { name: [props.sourceBucket.bucketName] },
          object: { key: [{ suffix: '.mp4' }] },
        },
      },
    });

    // Assign target to rule; set 5 retry attempts and assign dead letter queue
    this.videoUploadRule.addTarget(new targets.LambdaFunction(props.function, {
      retryAttempts: 5,
      deadLetterQueue: this.videoUploadDlq,
     }));

  }
}
