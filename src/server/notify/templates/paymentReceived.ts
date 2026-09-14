import type { PaymentMethod } from '@prisma/client';

import { renderEmailLayout } from '@/server/notify/templates/layout';
import { formatManualPaymentCode } from '@/server/payment/manual-qris';

export type PaymentReceivedPayload = {
  orderNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  manualPaymentCode: number | null;
  verifiedAt: string;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Transfer Bank',
  EWALLET: 'E-Wallet',
  QRIS: 'QRIS',
  POS_CASH: 'Tunai (POS)',
  POS_TRANSFER: 'Transfer (POS)',
  POS_QRIS: 'QRIS (POS)',
  POS_GATEWAY: 'Payment Gateway (POS)',
};

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

function formatDateTime(iso: string): string {
  return `${new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
    timeStyle: 'short',
  })} WIB`;
}

function renderDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:6px 0 6px 16px;font-size:13px;color:#111827;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}

export function paymentReceivedEmail(payload: PaymentReceivedPayload): {
  subject: string;
  html: string;
} {
  const rows = [
    renderDetailRow('Metode Pembayaran', PAYMENT_METHOD_LABELS[payload.paymentMethod]),
    ...(payload.manualPaymentCode
      ? [renderDetailRow('Kode Unik', formatManualPaymentCode(payload.manualPaymentCode))]
      : []),
    renderDetailRow('Diverifikasi Pada', formatDateTime(payload.verifiedAt)),
    renderDetailRow('Total Diterima', formatRupiah(payload.total)),
  ].join('');

  return {
    subject: `Pembayaran Berhasil [${payload.orderNumber}]`,
    html: renderEmailLayout(
      'Pembayaran Berhasil',
      `<p>Pembayaran untuk pesanan <strong>${payload.orderNumber}</strong> sudah kami verifikasi. Kami akan segera memproses pengiriman.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;">
         <tr>
           <td style="background-color:#f9fafb;border-radius:8px;padding:8px 16px;">
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
               ${rows}
             </table>
           </td>
         </tr>
       </table>`,
    ),
  };
}
