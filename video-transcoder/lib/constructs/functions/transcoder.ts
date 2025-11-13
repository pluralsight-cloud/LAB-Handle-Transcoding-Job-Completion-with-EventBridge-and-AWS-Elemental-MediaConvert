import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface VideoTranscoderFnProps {
  sourceBucket: s3.IBucket;
  destBucket: s3.IBucket;
  mediaConvertJobRoleArn: string;
  lambdaRole: iam.IRole;
  table: string;
  tableArn: string;
  projectTag?: string;
}

export class VideoTranscoderFn extends Construct {
  readonly videoTranscoderFn: lambda.Function;

  constructor(scope: Construct, id: string, props: VideoTranscoderFnProps) {
    super(scope, id);

    const videoTranscoderFnName = 'VideoTranscoderFn';
    const tag = props.projectTag ?? 'videopipeline';

    const logGroup = new logs.LogGroup(this, 'VideoTranscoderLogGroup', {
      logGroupName: `/aws/lambda/${videoTranscoderFnName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.videoTranscoderFn = new lambda.Function(this, 'VideoTranscoderFn', {
      functionName: videoTranscoderFnName,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'index.handler',
      role: props.lambdaRole,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..','..', 'lambda', 'transcoder')),
      environment: {
        DESTINATION_BUCKET: props.destBucket.bucketName,
        MEDIACONVERT_ROLE_ARN: props.mediaConvertJobRoleArn,
        TABLE_NAME: props.table,
      },
      logGroup: logGroup,
    });

    cdk.Tags.of(this.videoTranscoderFn).add('project', tag);
  }
}