'use client';

import { useState } from 'react';

import { btnSolid } from '@/lib/styles';

function formatClaimedAt(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClaimPaymentButton({
  orderId,
  initialClaimedAt,
  onClaimed,
}: {
  orderId: string;
  initialClaimedAt: string | null;
  onClaimed?: (claimedAt: string) => void;
}) {
  const [claimedAt, setClaimedAt] = useState(initialClaimedAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/claim-payment`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Gagal mengirim konfirmasi. Silakan coba lagi.');
        return;
      }
      setClaimedAt(data.paymentClaimedAt);
      onClaimed?.(data.paymentClaimedAt);
    } catch {
      setError('Gagal mengirim konfirmasi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (claimedAt) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
        Terima kasih! Konfirmasi Anda diterima pada {formatClaimedAt(claimedAt)}. Tim kami sedang
        memeriksa pembayaran Anda.
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800">
        Hanya tekan tombol ini jika Anda <strong>sudah menyelesaikan pembayaran QRIS</strong> sesuai
        nominal yang tertera. Setelah dikonfirmasi, QRIS tidak akan tampil lagi dan admin kami akan
        memeriksa pembayaran Anda.
      </div>
      <button
        type="button"
        onClick={handleClaim}
        disabled={submitting}
        className={`${btnSolid} w-full py-3 text-base`}
      >
        {submitting ? 'Mengirim...' : 'Saya Sudah Transfer'}
      </button>
      {error ? <p className="text-xs text-red">{error}</p> : null}
    </div>
  );
}
