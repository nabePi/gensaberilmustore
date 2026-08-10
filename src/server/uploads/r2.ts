import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { env } from '@/env';

let client: S3Client | null = null;

export function isR2Enabled(): boolean {
  return env.storageProvider === 'r2';
}

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId!,
        secretAccessKey: env.r2SecretAccessKey!,
      },
    });
  }
  return client;
}

function publicUrlForKey(key: string): string {
  return `${env.r2PublicUrl!.replace(/\/$/, '')}/${key}`;
}

export async function uploadToR2(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.r2Bucket!,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );
  return publicUrlForKey(key);
}

/** Best-effort delete: a missing object (already removed, or never written) is not an error. */
export async function deleteFromR2(publicUrl: string): Promise<void> {
  const key = keyFromPublicUrl(publicUrl);
  if (!key) return;

  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: env.r2Bucket!, Key: key }));
  } catch {
    // ignore
  }
}

function keyFromPublicUrl(publicUrl: string): string | null {
  const base = env.r2PublicUrl?.replace(/\/$/, '');
  if (!base || !publicUrl.startsWith(`${base}/`)) return null;
  return publicUrl.slice(base.length + 1);
}
