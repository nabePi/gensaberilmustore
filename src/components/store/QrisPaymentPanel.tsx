'use client';

import { useState } from 'react';

import { ClaimPaymentButton } from '@/components/store/ClaimPaymentButton';
import { formatCurrency } from '@/lib/format';

export function QrisPaymentPanel({
  orderId,
  orderNumber,
  manualPaymentCodeFormatted,
  amountDue,
  total,
  initialClaimedAt,
}: {
  orderId: string;
  orderNumber: string;
  manualPaymentCodeFormatted: string;
  amountDue: number;
  total: number;
  initialClaimedAt: string | null;
}) {
  const [claimedAt, setClaimedAt] = useState(initialClaimedAt);

  return (
    <div className="container-prototype flex flex-col items-center gap-4 pt-6 pb-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">
        {claimedAt ? 'Pembayaran Sedang Dicek Admin' : 'Selesaikan Pembayaran'}
      </h1>
      {claimedAt === null ? (
        <>
          <p className="max-w-md text-sm text-neutral-500">
            Scan QRIS di bawah ini dan transfer <strong>tepat sejumlah</strong> nominal yang tertera
            (termasuk 3 digit kode unik) agar pesanan Anda dapat kami verifikasi.
          </p>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qris.jpeg" alt="QRIS Berilmu Bookstore" className="w-72 max-w-full" />
          </div>
        </>
      ) : null}
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-6 py-4 text-sm">
        <p>
          <strong>No. Pesanan:</strong> {orderNumber}
        </p>
        <p>
          <strong>Kode Unik:</strong> {manualPaymentCodeFormatted}
        </p>
      </div>
      <div className="w-full max-w-sm rounded-lg border-2 border-brand bg-brand-50 px-6 py-5">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">
          Total + Kode Unik
        </p>
        <p className="text-3xl font-extrabold text-brand">{formatCurrency(amountDue)}</p>
        <p className="text-xs text-neutral-500">
          ({formatCurrency(total)} + kode unik {manualPaymentCodeFormatted})
        </p>
      </div>
      <p className="max-w-md text-xs text-neutral-500">
        Kode unik ini menjadi milik GenSa Berilmu dan tidak dapat dikembalikan/direfund.
      </p>
      <ClaimPaymentButton
        orderId={orderId}
        initialClaimedAt={initialClaimedAt}
        onClaimed={setClaimedAt}
      />
    </div>
  );
}
