import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DatabaseProps {
  tableName?: string;
  projectTag?: string;
}

export class Database extends Construct {
  readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseProps = {}) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'TranscoderJobs', {
      tableName: props.tableName ?? 'TranscoderJobs',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'objectId', type: dynamodb.AttributeType.STRING },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: 'jobId',
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    cdk.Tags.of(this.table).add('project', props.projectTag ?? 'videopipeline');
  }
}