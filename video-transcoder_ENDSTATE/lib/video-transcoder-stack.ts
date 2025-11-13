import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Storage } from './constructs/storage';
import { VideoUploadRule } from './constructs/eventbridge-rules/source-rule';
import { MediaConvertRole } from './constructs/permissions/mediaconvert-role';
import { LambdaTranscoderRole } from './constructs/permissions/lambda-transcoder-role';
import { VideoTranscoderFn } from './constructs/functions/transcoder';
import { Database } from './constructs/database';
import { TranscoderStatusFn } from './constructs/functions/transcoder-status';
import { StatusRule } from './constructs/eventbridge-rules/status-rule';

export class VideoTranscoderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Storage
    const storage = new Storage(this, 'Storage', { projectTag: 'videotranscode' });

    // MediaConvert role
    const mediaConvertRole = new MediaConvertRole(this, 'MediaConvertPermissions', {
      sourceBucket: storage.sourceBucket,
      destBucket: storage.destBucket,
      projectTag: 'videopipeline',
    });

    // Database
    const database = new Database(this, 'TranscoderJobs', { });

    // Lambda role
    const lambdaRole = new LambdaTranscoderRole(this, 'LambdaMediaConvertRole', {
      mediaConvertJobRoleArn: mediaConvertRole.role.roleArn,
      tableArn: database.table.tableArn,
      projectTag: 'videopipeline'
    });

    // Lambda functions
    const transcoderFn = new VideoTranscoderFn(this, 'VideoTranscoder', {
      sourceBucket: storage.sourceBucket,
      destBucket: storage.destBucket,
      table: database.table.tableName,
      tableArn: database.table.tableArn,
      lambdaRole: lambdaRole.role,
      mediaConvertJobRoleArn: mediaConvertRole.role.roleArn,
    });

    const statusFn = new TranscoderStatusFn(this, 'TranscoderStatusFn', {
      table: database.table.tableName,
      tableArn: database.table.tableArn,
      lambdaRole: lambdaRole.role,
      mediaConvertJobRoleArn: mediaConvertRole.role.roleArn,
    });

    // EventBridge rules
    new VideoUploadRule(this, 'VideoUploadRule', {
      sourceBucket: storage.sourceBucket,
      destBucket:   storage.destBucket,
      function:  transcoderFn.videoTranscoderFn,
      projectTag:   'videopipeline'
    });

    new StatusRule(this, 'TranscoderStatusRule', {
      function:  statusFn.transcoderStatusFn,
      projectTag:   'videopipeline'
    });

  }
}
