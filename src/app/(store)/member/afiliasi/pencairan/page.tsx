'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import { badgeBase, btnSolid, cardBase, inputBase } from '@/lib/styles';

type WithdrawalStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';

type Withdrawal = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  completedAt: string | null;
};

type WithdrawalData = {
  available: number;
  minAmount: number;
  bank: { name: string; account: string; holder: string };
  withdrawals: Withdrawal[];
};

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  REQUESTED: 'Diajukan',
  IN_PROGRESS: 'Diproses',
  COMPLETED: 'Selesai',
};

const STATUS_CLASS: Record<WithdrawalStatus, string> = {
  REQUESTED: 'bg-neutral-100 text-neutral-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MemberAfiliasiPencairanPage() {
  const [data, setData] = useState<WithdrawalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/affiliate/withdrawals');
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setLoadError(body?.error ?? 'Gagal memuat data pencairan');
      setLoading(false);
      return;
    }
    setData(await response.json());
    setLoadError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-neutral-500">Memuat…</p>;
  if (loadError || !data) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {loadError ?? 'Gagal memuat data pencairan'}
      </p>
    );
  }

  const canWithdraw = data.available >= data.minAmount;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setFormError(null);
    setSuccess(null);

    const amount = Number(amountInput);
    if (!Number.isInteger(amount) || amount < data.minAmount) {
      setFormError(`Pencairan minimal ${formatCurrency(data.minAmount)}`);
      return;
    }
    if (amount > data.available) {
      setFormError('Jumlah melebihi komisi masuk yang tersedia');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/affiliate/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(body?.error ?? 'Gagal mengajukan pencairan');
        return;
      }
      setAmountInput('');
      setSuccess('Pengajuan pencairan terkirim. Status: Diajukan.');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/member/afiliasi" className="text-sm text-brand hover:underline">
          ← Program Afiliasi
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Pencairan Komisi</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ajukan pencairan dari komisi masuk. Minimal {formatCurrency(data.minAmount)} per
          pengajuan.
        </p>
      </div>

      <div className={`p-4 ${cardBase}`}>
        <p className="text-xs text-neutral-500">Komisi masuk yang bisa dicairkan</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(data.available)}</p>
        <p className="mt-1 text-xs text-neutral-400">
          Komisi dari order selesai, setelah dikurangi pencairan yang sudah Anda ajukan.
        </p>

        {canWithdraw ? (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:max-w-sm" noValidate>
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Jumlah pencairan (Rp)
              <input
                type="number"
                inputMode="numeric"
                min={data.minAmount}
                max={data.available}
                step={1}
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder={`${data.minAmount} - ${data.available}`}
                className={inputBase}
                aria-describedby="withdraw-error"
              />
            </label>
            <button
              type="button"
              onClick={() => setAmountInput(String(data.available))}
              className="self-start text-xs font-medium text-brand hover:underline"
            >
              Cairkan semua ({formatCurrency(data.available)})
            </button>
            <p className="text-xs text-neutral-500">
              Ditransfer ke {data.bank.name} {data.bank.account} a.n. {data.bank.holder}.
            </p>
            {formError ? (
              <p id="withdraw-error" role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            ) : null}
            <button type="submit" disabled={submitting} className={btnSolid}>
              {submitting ? 'Mengirim…' : 'Ajukan Pencairan'}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-neutral-600">
            Pencairan bisa diajukan setelah komisi masuk mencapai {formatCurrency(data.minAmount)}.
            Kurang {formatCurrency(data.minAmount - data.available)} lagi.
          </p>
        )}
        {success ? (
          <p role="status" className="mt-3 text-sm text-green-700">
            {success}
          </p>
        ) : null}
      </div>

      <div className={`p-4 ${cardBase}`}>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Riwayat Pencairan</h2>
        {data.withdrawals.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada pengajuan pencairan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4">Jumlah</th>
                  <th className="py-2 pr-4">Tanggal Pengajuan</th>
                  <th className="py-2 pr-4">Tanggal Berhasil Dicairkan</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.withdrawals.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 font-semibold text-foreground">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600">{formatDate(item.requestedAt)}</td>
                    <td className="py-2 pr-4 text-neutral-600">{formatDate(item.completedAt)}</td>
                    <td className="py-2">
                      <span className={`${badgeBase} ${STATUS_CLASS[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
