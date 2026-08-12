import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { env } from '../src/env';

async function main() {
  if (env.storageProvider !== 'r2') {
    console.log('STORAGE_PROVIDER is not "r2" — uploads use local disk. Nothing to check.');
    return;
  }

  console.log('accountId length:', env.r2AccountId?.length ?? 0, '(expect 32)');
  console.log('bucket:', env.r2Bucket);
  console.log('publicUrl:', env.r2PublicUrl);
  console.log('hasAccessKey:', Boolean(env.r2AccessKeyId));
  console.log('hasSecret:', Boolean(env.r2SecretAccessKey));

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId!,
      secretAccessKey: env.r2SecretAccessKey!,
    },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: env.r2Bucket! }));
    console.log('HeadBucket: OK');
  } catch (error) {
    const err = error as { $metadata?: { httpStatusCode?: number } };
    console.log(`HeadBucket: FAILED (HTTP ${err.$metadata?.httpStatusCode ?? 'unknown'})`);
    console.log(
      'Kemungkinan penyebab: access key/secret salah, atau token tidak punya izin pada bucket ini.',
    );
    process.exit(1);
  }

  try {
    const key = `misc/r2-check-${Date.now()}.txt`;
    await client.send(
      new PutObjectCommand({
        Bucket: env.r2Bucket!,
        Key: key,
        Body: new TextEncoder().encode('r2 check'),
        ContentType: 'text/plain',
      }),
    );
    console.log('PutObject: OK —', `${env.r2PublicUrl?.replace(/\/$/, '')}/${key}`);
    console.log('R2 siap dipakai untuk upload.');
  } catch (error) {
    const err = error as { $metadata?: { httpStatusCode?: number } };
    console.log(`PutObject: FAILED (HTTP ${err.$metadata?.httpStatusCode ?? 'unknown'})`);
    console.log('Token perlu permission Object Read & Write pada bucket ini.');
    process.exit(1);
  }
}

main();
