export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 8;
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Sniffs the real image format from its magic bytes rather than trusting the
 * client-supplied MIME type, since the result is used to pick the file
 * extension we write to disk (and later serve as a static file).
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export function extensionForMime(mime: string): string | null {
  return IMAGE_EXTENSION_BY_MIME[mime] ?? null;
}

const MIME_BY_IMAGE_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_EXTENSION_BY_MIME).map(([mime, extension]) => [extension, mime]),
);

export function mimeForExtension(extension: string): string {
  return MIME_BY_IMAGE_EXTENSION[extension] ?? 'application/octet-stream';
}
