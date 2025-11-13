import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface LambdaTranscoderRoleProps {
  mediaConvertJobRoleArn: string;
  tableArn: string;
  roleName?: string;
  projectTag?: string;
}

export class LambdaTranscoderRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: LambdaTranscoderRoleProps) {
    super(scope, id);

    const {
      mediaConvertJobRoleArn,
      tableArn,
      roleName = 'LambdaFnMediaConvertRole',
      projectTag = 'videopipeline',
    } = props;

    this.role = new iam.Role(this, 'Role', {
      roleName,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description:
        'IAM role assumed by Lambda functions that create AWS Elemental MediaConvert jobs and emit logs.',
    });

    const policy = new iam.Policy(this, 'LambdaMediaConvertPolicy', {
      policyName: 'LambdaMediaConvertPolicy2',
      statements: [
        new iam.PolicyStatement({
          sid: 'MediaConvertCreateJob',
          effect: iam.Effect.ALLOW,
          actions: ['mediaconvert:CreateJob'],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'LambdaLogs',
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'AllowPassMediaConvertRole',
          effect: iam.Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [mediaConvertJobRoleArn],
          conditions: {
            StringEquals: {
              'iam:PassedToService': 'mediaconvert.amazonaws.com',
            },
          },
        }),
        new iam.PolicyStatement({
          sid: 'DynamoDbWriteAccess',
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:BatchWriteItem',
            'dynamodb:DescribeTable',
            'dynamodb:GetItem',
            'dynamodb:Query',
          ],
          resources: [
            tableArn,
            `${tableArn}/index/jobId`,
          ],
        }),
      ],
    });

    policy.attachToRole(this.role);

    cdk.Tags.of(this.role).add('project', projectTag);
  }
}