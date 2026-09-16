// Converts a static QRIS (EMVCo QR Code) payload into a dynamic one with a fixed
// transaction amount baked in, so the payer's banking app shows the amount
// pre-filled instead of asking them to type it in manually.
//
// QRIS payloads are TLV-encoded (Tag-Length-Value): 2-digit tag, 2-digit length,
// then that many characters of value. "Static" codes have tag 01 = "11" and no
// amount; "dynamic" codes have tag 01 = "12" plus tag 54 (Transaction Amount).
// The whole payload ends with tag 63 (CRC16-CCITT checksum of everything before it).

const CRC_TAG = '63';
const CRC_LENGTH = 4;
const AMOUNT_TAG = '54';
const COUNTRY_CODE_TAG = '58';
const MANAGED_TAGS = new Set([AMOUNT_TAG, '55', '56', '57', CRC_TAG]);

export class QrisConversionError extends Error {}

type TLV = { tag: string; value: string };

function parseTlv(payload: string): TLV[] {
  const elements: TLV[] = [];
  let pos = 0;

  while (pos < payload.length) {
    if (pos + 4 > payload.length) {
      throw new QrisConversionError('Format QRIS tidak valid: data terpotong');
    }
    const tag = payload.slice(pos, pos + 2);
    const length = Number.parseInt(payload.slice(pos + 2, pos + 4), 10);
    if (Number.isNaN(length) || pos + 4 + length > payload.length) {
      throw new QrisConversionError('Format QRIS tidak valid: panjang data tidak sesuai');
    }
    elements.push({ tag, value: payload.slice(pos + 4, pos + 4 + length) });
    pos += 4 + length;
  }

  return elements;
}

function buildTlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

/** CRC16-CCITT (poly 0x1021, init 0xFFFF), the checksum algorithm required by EMVCo QR codes. */
export function calculateQrisCrc16(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Returns an error message if the payload isn't a well-formed QRIS string, or null if it's valid. */
export function validateStaticQris(payload: string): string | null {
  const trimmed = payload.trim();

  if (!trimmed) {
    return 'Kode QRIS masih kosong';
  }
  if (!trimmed.startsWith('000201')) {
    return 'Kode QRIS harus diawali "000201" (Payload Format Indicator)';
  }
  if (trimmed.length < 20) {
    return 'Kode QRIS terlalu pendek';
  }

  const crcInput = trimmed.slice(0, -CRC_LENGTH);
  const declaredCrc = trimmed.slice(-CRC_LENGTH).toUpperCase();
  const expectedCrc = calculateQrisCrc16(crcInput);
  if (declaredCrc !== expectedCrc) {
    return `Checksum QRIS tidak cocok (seharusnya ${expectedCrc}), pastikan kode disalin lengkap dan benar`;
  }

  try {
    parseTlv(trimmed);
  } catch (error) {
    return error instanceof QrisConversionError ? error.message : 'Format QRIS tidak valid';
  }

  return null;
}

/**
 * Convert a static QRIS payload into a dynamic one carrying a fixed amount.
 * Throws QrisConversionError if the payload is invalid or amount is not positive.
 */
export function buildDynamicQris(staticPayload: string, amount: number): string {
  const trimmed = staticPayload.trim();
  const validationError = validateStaticQris(trimmed);
  if (validationError) {
    throw new QrisConversionError(validationError);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new QrisConversionError('Nominal QRIS harus lebih dari 0');
  }

  const elements = parseTlv(trimmed);
  const rebuilt: string[] = [];
  let amountInserted = false;

  for (const element of elements) {
    if (MANAGED_TAGS.has(element.tag)) continue;

    if (element.tag === '01') {
      rebuilt.push(buildTlv('01', '12')); // Point of Initiation Method: static -> dynamic
      continue;
    }

    if (element.tag === COUNTRY_CODE_TAG && !amountInserted) {
      rebuilt.push(buildTlv(AMOUNT_TAG, Math.round(amount).toString()));
      amountInserted = true;
    }

    rebuilt.push(buildTlv(element.tag, element.value));
  }

  if (!amountInserted) {
    throw new QrisConversionError('Tag Country Code (58) tidak ditemukan pada QRIS');
  }

  const withoutCrc = `${rebuilt.join('')}${CRC_TAG}${CRC_LENGTH.toString().padStart(2, '0')}`;
  return `${withoutCrc}${calculateQrisCrc16(withoutCrc)}`;
}
