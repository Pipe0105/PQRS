import { NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { presignSchema } from "@/lib/validators/pqrs";
import { getS3Client, getPublicUrl } from "@/lib/storage";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const bucket = process.env.S3_BUCKET;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  if (!bucket) {
    return NextResponse.json({ error: "S3_BUCKET no configurado" }, { status: 500 });
  }

  const payload = await request.json();
  const parsed = presignSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Archivos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  const s3Client = getS3Client();
  const uploads = await Promise.all(
    parsed.data.files.map(async (file) => {
      const safeName = sanitizeFileName(file.name);
      const key = `pqrs/${yyyy}/${mm}/${dd}/${nanoid(10)}-${safeName}`;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: file.mimeType,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

      return {
        key,
        url,
        publicUrl: getPublicUrl(key),
        mimeType: file.mimeType,
        size: file.size,
        originalName: file.name,
      };
    }),
  );

  return NextResponse.json({ uploads });
}
