import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'products');
const AVATAR_UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'avatars');

export async function saveProductImage(
  productId: string,
  bytes: Uint8Array,
  extension: string,
): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, productId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(dir, filename), bytes);

  return `/uploads/products/${productId}/${filename}`;
}

/** Best-effort delete: a missing file (already removed, or never written) is not an error. */
export async function deleteProductImageFile(publicUrl: string): Promise<void> {
  const filePath = path.join(process.cwd(), 'public', publicUrl);
  try {
    await unlink(filePath);
  } catch {
    // ignore
  }
}

export async function saveAvatarImage(
  userId: string,
  bytes: Uint8Array,
  extension: string,
): Promise<string> {
  const dir = path.join(AVATAR_UPLOADS_ROOT, userId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(dir, filename), bytes);

  return `/uploads/avatars/${userId}/${filename}`;
}

/** Best-effort delete: a missing file (already removed, or never written) is not an error. */
export async function deleteAvatarImageFile(publicUrl: string): Promise<void> {
  const filePath = path.join(process.cwd(), 'public', publicUrl);
  try {
    await unlink(filePath);
  } catch {
    // ignore
  }
}
