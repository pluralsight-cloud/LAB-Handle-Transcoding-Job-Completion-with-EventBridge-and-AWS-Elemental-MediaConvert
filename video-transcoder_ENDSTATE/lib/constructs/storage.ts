import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StorageProps {
  projectTag?: string;
}

export class Storage extends Construct {
  readonly sourceBucket: s3.Bucket;
  readonly destBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageProps = {}) {
    super(scope, id);

    // Define variables
    const account = cdk.Stack.of(this).account;
    const region  = cdk.Stack.of(this).region;
    const tag = props.projectTag ?? 'videopipeline';

    // Create source bucket and tag
    this.sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      bucketName: `video-source-bucket-${account}-${region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      eventBridgeEnabled: true,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    cdk.Tags.of(this.sourceBucket).add('project', tag);

    // Create destination bucket and tag
    this.destBucket = new s3.Bucket(this, 'DestBucket', {
      bucketName: `video-destination-bucket-${account}-${region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      eventBridgeEnabled: true,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    cdk.Tags.of(this.destBucket).add('project', tag);
  }
}