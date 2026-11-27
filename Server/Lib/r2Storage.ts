import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) helper for PRIVATE KYC images.
 * Never make this bucket public. Images are only ever read through
 * short-lived signed URLs generated for admin reviewers.
 */

let client: S3Client | null = null;

function bucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME || "";
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set");
  return bucket;
}

function getClient(): S3Client {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  }

  client = new S3Client({
    region: "auto",
    endpoint:
      process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Newer AWS SDK versions add checksum headers by default; only send them when required.
    // (Ignored by older SDK versions.)
    ...({
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    } as any),
  });
  return client;
}

export async function putPrivateObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedReadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucketName(), Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucketName(), Key: key })
  );
}