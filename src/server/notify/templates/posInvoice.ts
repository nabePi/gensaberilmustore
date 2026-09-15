import { renderEmailLayout, resolveEmailImageUrl } from '@/server/notify/templates/layout';

export type PosInvoiceItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
};

export type PosInvoicePayload = {
  orderNumber: string;
  receiverName: string;
  items: PosInvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethodLabel: string;
};

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

function renderItemsRows(items: PosInvoiceItem[]): string {
  return items
    .map((item) => {
      const image = resolveEmailImageUrl(item.imageUrl);
      const thumbnail = image
        ? `<img src="${image}" alt="${item.title}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;" />`
        : `<div style="width:56px;height:56px;border-radius:8px;background-color:#f3f4f6;"></div>`;

      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f1f3;width:56px;">${thumbnail}</td>
        <td style="padding:12px 0 12px 14px;border-bottom:1px solid #f0f1f3;vertical-align:top;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${item.title}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${item.quantity} x ${formatRupiah(item.unitPrice)}</p>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f1f3;text-align:right;vertical-align:top;white-space:nowrap;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${formatRupiah(item.lineTotal)}</p>
        </td>
      </tr>`;
    })
    .join('');
}

function renderSummaryRow(label: string, value: string, options?: { bold?: boolean }): string {
  const weight = options?.bold ? '700' : '400';
  const color = options?.bold ? '#111827' : '#6b7280';
  return `<tr>
    <td style="padding:4px 0;font-size:13px;color:${color};font-weight:${weight};">${label}</td>
    <td style="padding:4px 0;font-size:13px;color:${color};font-weight:${weight};text-align:right;">${value}</td>
  </tr>`;
}

export function posInvoiceEmail(payload: PosInvoicePayload): {
  subject: string;
  html: string;
} {
  const summaryRows = [
    renderSummaryRow('Subtotal', formatRupiah(payload.subtotal)),
    ...(payload.discount > 0
      ? [renderSummaryRow('Diskon', `-${formatRupiah(payload.discount)}`)]
      : []),
    renderSummaryRow('Total', formatRupiah(payload.total), { bold: true }),
    renderSummaryRow('Metode Pembayaran', payload.paymentMethodLabel),
  ].join('');

  return {
    subject: `Invoice Pembelian [${payload.orderNumber}]`,
    html: renderEmailLayout(
      'Invoice Pembelian',
      `<p>Halo ${payload.receiverName},</p>
       <p>Terima kasih telah berbelanja di toko kami. Berikut rincian pembelian dengan nomor <strong>${payload.orderNumber}</strong> yang sudah lunas dibayar:</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;">
         ${renderItemsRows(payload.items)}
       </table>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;padding-top:8px;border-top:1px solid #e5e7eb;">
         ${summaryRows}
       </table>
       <p>Terima kasih telah berbelanja di Gensa Berilmu Store.</p>`,
    ),
  };
}
