import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { mimeForExtension } from '@/server/uploads/image';
import { deleteFromR2, isR2Enabled, uploadToR2 } from '@/server/uploads/r2';

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'products');
const AVATAR_UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MISC_UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'misc');

async function saveLocal(dir: string, publicPrefix: string, bytes: Uint8Array, extension: string) {
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(dir, filename), bytes);
  return `${publicPrefix}/${filename}`;
}

/** Best-effort delete: a missing file (already removed, or never written) is not an error. */
async function deleteLocal(publicUrl: string): Promise<void> {
  const filePath = path.join(process.cwd(), 'public', publicUrl);
  try {
    await unlink(filePath);
  } catch {
    // ignore
  }
}

export async function saveProductImage(
  productId: string,
  bytes: Uint8Array,
  extension: string,
): Promise<string> {
  if (isR2Enabled()) {
    const key = `products/${productId}/${randomUUID()}.${extension}`;
    return uploadToR2(key, bytes, mimeForExtension(extension));
  }

  return saveLocal(
    path.join(UPLOADS_ROOT, productId),
    `/uploads/products/${productId}`,
    bytes,
    extension,
  );
}

export async function deleteProductImageFile(publicUrl: string): Promise<void> {
  if (isR2Enabled()) {
    return deleteFromR2(publicUrl);
  }
  return deleteLocal(publicUrl);
}

export async function saveAvatarImage(
  userId: string,
  bytes: Uint8Array,
  extension: string,
): Promise<string> {
  if (isR2Enabled()) {
    const key = `avatars/${userId}/${randomUUID()}.${extension}`;
    return uploadToR2(key, bytes, mimeForExtension(extension));
  }

  return saveLocal(
    path.join(AVATAR_UPLOADS_ROOT, userId),
    `/uploads/avatars/${userId}`,
    bytes,
    extension,
  );
}

export async function deleteAvatarImageFile(publicUrl: string): Promise<void> {
  if (isR2Enabled()) {
    return deleteFromR2(publicUrl);
  }
  return deleteLocal(publicUrl);
}

/** Generic image upload used by config screens (homepage/kids banners, promo images, etc). */
export async function saveGenericImage(bytes: Uint8Array, extension: string): Promise<string> {
  if (isR2Enabled()) {
    const key = `misc/${randomUUID()}.${extension}`;
    return uploadToR2(key, bytes, mimeForExtension(extension));
  }

  return saveLocal(MISC_UPLOADS_ROOT, '/uploads/misc', bytes, extension);
}
