import { MediaConvertClient, CreateJobCommand } from "@aws-sdk/client-mediaconvert";
// Import DynamoDB module
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const parseS3Event = (e) => {
  if (e?.source !== "aws.s3" || !String(e?.["detail-type"]).includes("Object Created")) {
    throw new Error("Unexpected event");
  }
  const bucket = e?.detail?.bucket?.name;
  let key = e?.detail?.object?.key;
  if (!bucket || !key) throw new Error("Missing bucket/key in event");
  try { key = decodeURIComponent(key.replace(/\+/g, " ")); } catch {}
  return { bucket, key };
};

const region = process.env.AWS_REGION || "us-east-1";
const mc = new MediaConvertClient({ region });
// DynamoDB client
const ddb = new DynamoDBClient({ region });

export const handler = async (event) => {
  const { bucket, key } = parseS3Event(event);
  if (!/\.mp4$/i.test(key)) return { ignored: true };

  const destBucket = env("DESTINATION_BUCKET");
  const roleArn = env("MEDIACONVERT_ROLE_ARN");
  const tableName = env("TABLE_NAME");

  const Settings = {
    TimecodeConfig: { Source: "ZEROBASED" },
    Inputs: [{ FileInput: `s3://${bucket}/${key}` }],
    OutputGroups: [
      {
        OutputGroupSettings: {
          Type: "FILE_GROUP_SETTINGS",
          FileGroupSettings: { Destination: `s3://${destBucket}/processed/` },
        },
        Outputs: [
          {
            ContainerSettings: { Container: "MP4", Mp4Settings: {} },
            VideoDescription: {
              CodecSettings: {
                Codec: "H_264",
                H264Settings: {
                  RateControlMode: "QVBR",
                  QvbrQualityLevel: 7,
                  MaxBitrate: 5_000_000,
                  SceneChangeDetect: "TRANSITION_DETECTION",
                },
              },
            },
          },
        ],
      },
    ],
  };

  const { Job } = await mc.send(new CreateJobCommand({ Role: roleArn, Settings }));
  const jobId = Job?.Id ?? "UNKNOWN";

  // Persist job metadata to DynamoDB
  await ddb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: {
        objectId: { S: key },
        jobId: { S: jobId },
        status: { S: "processing" },
        updatedAt: { S: new Date().toISOString() },
      },
    })
  );

  return { status: "submitted", jobId, objectId: key };
};