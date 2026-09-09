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
}: {
  orderId: string;
  initialClaimedAt: string | null;
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
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <button type="button" onClick={handleClaim} disabled={submitting} className={btnSolid}>
        {submitting ? 'Mengirim...' : 'Saya Sudah Transfer'}
      </button>
      {error ? <p className="text-xs text-red">{error}</p> : null}
    </div>
  );
}
