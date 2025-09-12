import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Env
const BUCKET = process.env.BUCKET;
const REGION = process.env.REGION || "us-east-1";
const API_SECRET = process.env.API_SECRET;
const DEFAULT_EXPIRES = Number(process.env.DEFAULT_EXPIRES || 900);
const MAX_EXPIRES = 3600; // clamp to 1 hour

const s3 = new S3Client({ region: REGION });

function ok(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function bad(status, message) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ error: message })
  };
}

export const handler = async (event) => {
  try {
    // Allow CORS preflight for HTTP APIs
    const method = event?.requestContext?.http?.method || event?.httpMethod;
    if (method === "OPTIONS") return ok({});

    const headers = Object.fromEntries(
      Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
    );
    const isJson = (headers["content-type"] || "").includes("application/json");

    const body = isJson && event.body ? JSON.parse(event.body) : {};
    const qs = event.queryStringParameters || {};

    // --- Password check (shared secret) ---
    const token = body.token || qs.token || headers["x-api-key"];
    if (!API_SECRET || token !== API_SECRET) {
      return bad(403, "Forbidden");
    }

    // --- Inputs ---
    const filenameRaw = (body.filename || qs.filename || "").trim();
    if (!filenameRaw) return bad(400, "filename required");

    // Basic sanitation: block control chars, path traversal, absolute paths
    if (/[<>:"\\|?*\x00-\x1F]/.test(filenameRaw) || filenameRaw.includes("..") || filenameRaw.startsWith("/")) {
      return bad(400, "Invalid filename");
    }

    const contentType = (body.contentType || qs.contentType || "application/octet-stream").trim();
    const expiresIn = Math.min(Number(body.expiresIn || qs.expiresIn || DEFAULT_EXPIRES), MAX_EXPIRES);

    // Force into a safe prefix
    const key = `uploads/${filenameRaw}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType
      // If you do NOT have default bucket encryption and want to enforce SSE-KMS:
      // ServerSideEncryption: "aws:kms",
      // SSEKMSKeyId: process.env.KMS_KEY_ID
    });

    const url = await getSignedUrl(s3, command, { expiresIn });
    return ok({ url, bucket: BUCKET, key, expiresIn });
  } catch (err) {
    console.error(err);
    return bad(500, "Internal error");
  }
};
