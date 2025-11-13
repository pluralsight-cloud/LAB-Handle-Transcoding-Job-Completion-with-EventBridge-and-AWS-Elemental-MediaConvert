import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface TranscoderStatusFnProps {
  mediaConvertJobRoleArn: string;
  table: string;
  tableArn: string;
  lambdaRole: iam.IRole;
  projectTag?: string;
}

export class TranscoderStatusFn extends Construct {
  readonly transcoderStatusFn: lambda.Function;

  constructor(scope: Construct, id: string, props: TranscoderStatusFnProps) {
    super(scope, id);

    const transcoderStatusFnName = 'TranscoderStatusFn';
    const tag = props.projectTag ?? 'videopipeline';

    const logGroup = new logs.LogGroup(this, 'TranscoderStatusLogGroup', {
      logGroupName: `/aws/lambda/${transcoderStatusFnName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.transcoderStatusFn = new lambda.Function(this, 'TranscoderStatusFn', {
      functionName: transcoderStatusFnName,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'index.handler',
      role: props.lambdaRole,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..','..', 'lambda', 'transcoder-status')),
      environment: {
        TRANSCODE_JOBS_TABLE: props.table,
      },
      logGroup: logGroup,
    });

    cdk.Tags.of(this.transcoderStatusFn).add('project', tag);
  }
}