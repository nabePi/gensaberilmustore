import { renderEmailLayout, resolveEmailImageUrl } from '@/server/notify/templates/layout';

export type OrderConfirmedItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
};

export type OrderConfirmedPayload = {
  orderNumber: string;
  receiverName: string;
  items: OrderConfirmedItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
};

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

function renderItemsRows(items: OrderConfirmedItem[]): string {
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

export function orderConfirmedEmail(payload: OrderConfirmedPayload): {
  subject: string;
  html: string;
} {
  const summaryRows = [
    renderSummaryRow('Subtotal', formatRupiah(payload.subtotal)),
    renderSummaryRow('Ongkos Kirim', formatRupiah(payload.shippingCost)),
    ...(payload.discount > 0
      ? [renderSummaryRow('Diskon', `-${formatRupiah(payload.discount)}`)]
      : []),
    renderSummaryRow('Total', formatRupiah(payload.total), { bold: true }),
  ].join('');

  return {
    subject: `Pesanan Diterima [${payload.orderNumber}]`,
    html: renderEmailLayout(
      'Pesanan Diterima',
      `<p>Halo ${payload.receiverName},</p>
       <p>Pesanan <strong>${payload.orderNumber}</strong> kami terima. Silakan selesaikan pembayaran sesuai instruksi yang diberikan.</p>
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
