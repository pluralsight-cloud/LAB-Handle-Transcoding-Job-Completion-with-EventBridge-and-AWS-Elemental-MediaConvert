import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface EventsProps {
  function: lambda.IFunction;
  projectTag?: string;
}

export class StatusRule extends Construct {
  readonly jobStatusDlq: sqs.Queue;  
  readonly statusRule: events.Rule;

  constructor(scope: Construct, id: string, props: EventsProps) {
    super(scope, id);
    
    // Define variables
    const tag = props.projectTag ?? 'videopipeline';

    // Create dead letter SQS queue to store failures
    this.jobStatusDlq = new sqs.Queue(this, 'JobStatusDLQ', {
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });
    cdk.Tags.of(this.jobStatusDlq).add('project', tag);

    // Create EventBridge rule
    this.statusRule = new events.Rule(this, 'StatusRule', {
      description: 'Trigger Lambda to update job metadata when MediaConvert job is complete',
      eventPattern: {
        source: ['aws.mediaconvert'],
        detailType: ['MediaConvert Job State Change'],
        detail: {
          status: ['COMPLETE', 'ERROR'],
        },
      },
    });

    // Assign target to rule; set 5 retry attempts and assign dead letter queue
    this.statusRule.addTarget(new targets.LambdaFunction(props.function, {
      retryAttempts: 5,
      deadLetterQueue: this.jobStatusDlq,
     }));

  }
}