import PDFDocument from 'pdfkit';

import { formatCurrency } from '@/lib/format';
import type { serializeOrderDetail } from '@/server/orders/serialize';

type OrderDetail = ReturnType<typeof serializeOrderDetail>;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  POS_CASH: 'Tunai',
  POS_QRIS: 'QRIS',
  POS_TRANSFER: 'Transfer',
  POS_GATEWAY: 'Payment Gateway',
};

const COMBINING_DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS_REGEX, '')
    .trim()
    .replace(/[^a-zA-Z0-9._@ -]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '');
}

export function buildPosReceiptFilename(detail: OrderDetail): string {
  const parts = [detail.orderNumber];

  if (detail.receiver.name && detail.receiver.name !== 'Walk-in Customer') {
    const sanitized = sanitizeFilenamePart(detail.receiver.name);
    if (sanitized) parts.push(sanitized);
  }
  if (detail.receiver.phone && detail.receiver.phone !== '-') {
    const sanitized = sanitizeFilenamePart(detail.receiver.phone);
    if (sanitized) parts.push(sanitized);
  }
  if (detail.receiver.email && detail.receiver.email !== '-') {
    const sanitized = sanitizeFilenamePart(detail.receiver.email);
    if (sanitized) parts.push(sanitized);
  }

  return `${parts.join('-')}.pdf`;
}

export function generatePosReceiptPdf(params: {
  detail: OrderDetail;
  cashierName: string;
  storeName: string;
  storeAddress: string | null;
  storePhone: string | null;
}): Promise<Buffer> {
  const { detail, cashierName, storeName, storeAddress, storePhone } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 36 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(14).text(storeName, { align: 'center' });
    doc.font('Helvetica').fontSize(9);
    if (storeAddress) doc.text(storeAddress, { align: 'center' });
    if (storePhone) doc.text(storePhone, { align: 'center' });

    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(11).text('STRUK PEMBAYARAN', { align: 'center' });
    doc.moveDown(0.75);

    doc.font('Helvetica').fontSize(9);
    doc.text(`No. Transaksi: ${detail.orderNumber}`);
    doc.text(`Tanggal: ${new Date(detail.createdAt).toLocaleString('id-ID')}`);
    doc.text(`Kasir: ${cashierName}`);
    doc.text(
      `Pembayaran: ${PAYMENT_METHOD_LABELS[detail.payment.method] ?? detail.payment.method}`,
    );
    if (detail.receiver.name && detail.receiver.name !== 'Walk-in Customer') {
      doc.text(`Pelanggan: ${detail.receiver.name}`);
    }
    if (detail.receiver.phone && detail.receiver.phone !== '-') {
      doc.text(`Telepon: ${detail.receiver.phone}`);
    }
    if (detail.receiver.email && detail.receiver.email !== '-') {
      doc.text(`Email: ${detail.receiver.email}`);
    }

    doc.moveDown(0.75);
    doc
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.5);

    for (const item of detail.items) {
      doc.font('Helvetica-Bold').fontSize(9).text(item.title);
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(
          `${item.quantity} x ${formatCurrency(item.priceSnapshot)} = ${formatCurrency(item.lineTotal)}`,
        );
      doc.moveDown(0.3);
    }

    doc
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.5);

    doc
      .font('Helvetica')
      .fontSize(9)
      .text(`Subtotal: ${formatCurrency(detail.pricing.subtotal)}`, {
        align: 'right',
      });
    if (detail.pricing.discount > 0) {
      doc.text(`Diskon: -${formatCurrency(detail.pricing.discount)}`, { align: 'right' });
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`Total: ${formatCurrency(detail.pricing.total)}`, { align: 'right' });

    doc.moveDown(1.5);
    doc.font('Helvetica').fontSize(9).text('Terima kasih atas kunjungan Anda', { align: 'center' });

    doc.end();
  });
}
