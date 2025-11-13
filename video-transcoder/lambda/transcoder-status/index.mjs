import { DynamoDBClient, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const ddb = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const tableName = env("TRANSCODE_JOBS_TABLE");

// Helper: map MediaConvert -> pipeline status
const normalizeStatus = (mcStatus) => {
  if (mcStatus === "COMPLETE") return "complete";
  if (mcStatus === "ERROR") return "error";
  return null; // ignore other transitions (SUBMITTED, PROGRESSING, CANCELED, etc.)
};

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  const detail = event?.detail || {};
  const jobId = detail.jobId;           // <-- correct field
  const mcStatus = detail.status;       // e.g., COMPLETE or ERROR
  const newStatus = normalizeStatus(mcStatus);

  if (!jobId || !mcStatus) {
    console.warn("Missing jobId or status in event");
    return;
  }
  if (!newStatus) {
    console.log(`Ignoring non-terminal status: ${mcStatus}`);
    return;
  }

  // 1) Find the objectId via the GSI on jobId
  const q = new QueryCommand({
    TableName: tableName,
    IndexName: "jobId",                 // GSI name from your template
    KeyConditionExpression: "jobId = :j",
    ExpressionAttributeValues: { ":j": { S: jobId } },
    ProjectionExpression: "objectId"
  });

  const qr = await ddb.send(q);
  if (!qr.Items || qr.Items.length === 0) {
    console.warn(`No record found in ${tableName} for jobId=${jobId}`);
    return;
  }

  const objectId = qr.Items[0].objectId.S;
  if (!objectId) {
    console.warn(`Record for jobId=${jobId} missing objectId`);
    return;
  }

  // 2) Update the item by its partition key (objectId)
  const u = new UpdateItemCommand({
    TableName: tableName,
    Key: { objectId: { S: objectId } },
    UpdateExpression: "SET #s = :s, updatedAt = :t",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: {
      ":s": { S: newStatus },
      ":t": { S: new Date().toISOString() }
    }
  });

  await ddb.send(u);
  console.log(`Updated objectId=${objectId} (jobId=${jobId}) to status=${newStatus}`);
};