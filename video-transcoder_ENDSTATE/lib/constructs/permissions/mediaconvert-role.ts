import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface MediaConvertRoleProps {
  sourceBucket: s3.IBucket;
  destBucket: s3.IBucket;
  roleName?: string;
  projectTag?: string;
}

export class MediaConvertRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: MediaConvertRoleProps) {
    super(scope, id);

    const {
      sourceBucket,
      destBucket,
      roleName = 'MediaConvertJobRole',
      projectTag = 'videopipeline',
    } = props;

    this.role = new iam.Role(this, 'Role', {
      roleName,
      assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
      description:
        'Service role assumed by AWS Elemental MediaConvert jobs to read source from S3, write outputs to S3, and emit logs to CloudWatch.',
    });

    const policy = new iam.Policy(this, 'MediaConvertS3ReadWriteLogs', {
      policyName: 'MediaConvertS3ReadWriteLogs2',
      statements: [
        new iam.PolicyStatement({
          sid: 'ReadInput',
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
          resources: [
            sourceBucket.bucketArn,
            `${sourceBucket.bucketArn}/*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'WriteOutput',
          effect: iam.Effect.ALLOW,
          actions: ['s3:PutObject', 's3:PutObjectAcl', 's3:ListBucket'],
          resources: [
            destBucket.bucketArn,
            `${destBucket.bucketArn}/*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'Logs',
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ],
          resources: ['*'],
        }),
      ],
    });

    policy.attachToRole(this.role);

    cdk.Tags.of(this.role).add('project', projectTag);
  }
}