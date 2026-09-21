'use client';

import { useRef, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid } from '@/lib/styles';

const BANK_ACCOUNT = {
  bankName: 'Bank BCA',
  accountNumber: '5465398326',
  accountHolder: 'GENERASI SHALAHUDDIN BERILMU',
};

export function BankTransferPaymentPanel({
  orderId,
  orderNumber,
  manualPaymentCodeFormatted,
  amountDue,
  total,
  initialClaimedAt,
  initialProofUrl,
}: {
  orderId: string;
  orderNumber: string;
  manualPaymentCodeFormatted: string;
  amountDue: number;
  total: number;
  initialClaimedAt: string | null;
  initialProofUrl: string | null;
}) {
  const [claimedAt, setClaimedAt] = useState(initialClaimedAt);
  const [proofUrl, setProofUrl] = useState(initialProofUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Gagal mengunggah bukti pembayaran');
        return;
      }

      setProofUrl(data.paymentProofUrl);
      setClaimedAt(data.paymentClaimedAt);
    } catch {
      setError('Gagal mengunggah bukti pembayaran');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <div className="container-prototype flex flex-col items-center gap-4 pt-6 pb-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">
        {claimedAt ? 'Pembayaran Sedang Dicek Admin' : 'Selesaikan Pembayaran'}
      </h1>
      {claimedAt === null ? (
        <p className="max-w-md text-sm text-neutral-500">
          Transfer tepat sejumlah nominal di bawah ini (termasuk 3 digit kode unik) ke rekening
          berikut, lalu unggah bukti transfer agar pesanan Anda dapat kami verifikasi.
        </p>
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

      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-6 py-4 text-left text-sm">
        <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Transfer ke Rekening
        </p>
        <p className="font-bold text-foreground">{BANK_ACCOUNT.bankName}</p>
        <p className="text-lg font-bold tracking-wide text-foreground">
          {BANK_ACCOUNT.accountNumber}
        </p>
        <p className="text-neutral-600">a.n. {BANK_ACCOUNT.accountHolder}</p>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-6 py-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Bukti Pembayaran</p>
        {proofUrl ? (
          <div className="mb-3 overflow-hidden rounded-md border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proofUrl} alt="Bukti pembayaran" className="max-h-64 w-full object-contain" />
          </div>
        ) : (
          <p className="mb-3 text-xs text-neutral-500">
            Anda wajib mengunggah bukti transfer agar pesanan dapat diverifikasi.
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`${proofUrl ? btnOutline : btnSolid} w-full`}
        >
          {uploading
            ? 'Mengunggah...'
            : proofUrl
              ? 'Ganti Bukti Pembayaran'
              : 'Upload Bukti Pembayaran'}
        </button>
        {error ? <p className="mt-2 text-xs text-red">{error}</p> : null}
      </div>

      {claimedAt ? (
        <div className="w-full max-w-sm rounded-lg border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
          Terima kasih! Bukti pembayaran Anda diterima. Tim kami sedang memeriksa pembayaran Anda.
        </div>
      ) : null}
    </div>
  );
}
