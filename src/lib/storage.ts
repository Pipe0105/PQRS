import { S3Client } from "@aws-sdk/client-s3";

export function getS3Client() {
  const {
    S3_ENDPOINT,
    S3_REGION,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE,
  } = process.env;

  if (!S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Faltan variables de entorno para S3/MinIO");
  }

  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: S3_FORCE_PATH_STYLE === "true",
  });
}

export function getPublicUrl(key: string) {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${key}`;
  }
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  if (!endpoint || !bucket) {
    throw new Error("S3_PUBLIC_BASE_URL o S3_ENDPOINT/S3_BUCKET no configurados");
  }
  return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
}
