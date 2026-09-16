import { buildDynamicQris } from '@/server/payment/qris';
import { renderQrisDataUrl } from '@/server/payment/qris-image';

/**
 * Builds a dynamic QRIS image for the given amount from the merchant's static QRIS
 * code. Returns null (instead of throwing) if the static code isn't configured or is
 * invalid, so callers can fall back to the static QRIS image.
 */
export async function tryGenerateDynamicQrisDataUrl(
  staticQrisCode: string | null | undefined,
  amount: number,
): Promise<string | null> {
  if (!staticQrisCode) return null;

  try {
    const dynamicPayload = buildDynamicQris(staticQrisCode, amount);
    return await renderQrisDataUrl(dynamicPayload);
  } catch {
    return null;
  }
}
