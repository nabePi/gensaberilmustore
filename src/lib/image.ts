import type { SyntheticEvent } from 'react';

export const FALLBACK_IMAGE_URL = '/no-image.jpg';

export function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.src.endsWith(FALLBACK_IMAGE_URL)) return;
  img.src = FALLBACK_IMAGE_URL;
}
