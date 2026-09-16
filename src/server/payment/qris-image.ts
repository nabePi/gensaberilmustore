import QRCode from 'qrcode';

/** Renders a QRIS payload string as a scannable PNG data URL. */
export function renderQrisDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 320 });
}
