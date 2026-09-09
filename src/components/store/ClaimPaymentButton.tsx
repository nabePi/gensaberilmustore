'use client';

import { useState } from 'react';

import { btnOutline, btnSolid } from '@/lib/styles';

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
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleConfirm() {
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
      setShowConfirm(false);
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
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={`${btnSolid} w-full py-3 text-base`}
      >
        Saya Sudah Transfer
      </button>
      {error ? <p className="text-xs text-red">{error}</p> : null}

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
            <p className="text-sm font-semibold text-foreground">
              Apakah kamu benar sudah membayar dengan QRIS?
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Setelah dikonfirmasi, QRIS tidak akan tampil lagi dan admin kami akan memeriksa
              pembayaran Anda.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className={`${btnOutline} flex-1`}
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className={`${btnSolid} flex-1`}
              >
                {submitting ? 'Mengirim...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
