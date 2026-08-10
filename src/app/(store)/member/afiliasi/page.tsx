'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid, cardBase, inputBase } from '@/lib/styles';

type ProductPerformance = {
  productId: string;
  title: string;
  slug: string;
  commissionRate: { percent: number; fixedAmount: number | null; isActive: boolean } | null;
  revenueThisMonth: number;
};

type AffiliateStats = {
  profile: { code: string; isActive: boolean };
  totalClicks: number;
  totalConversions: number;
  commissionPending: number;
  commissionPaid: number;
  productPerformance: ProductPerformance[];
};

const joinSchema = z.object({
  payoutBankName: z.string().trim().min(1, 'Nama bank wajib diisi'),
  payoutBankAccount: z.string().trim().min(1, 'Nomor rekening wajib diisi'),
  payoutBankHolder: z.string().trim().min(1, 'Nama pemilik rekening wajib diisi'),
});

type JoinFormValues = z.infer<typeof joinSchema>;

function OnboardingCard({ onJoined }: { onJoined: () => void }) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinFormValues>({ resolver: zodResolver(joinSchema) });

  async function onSubmit(values: JoinFormValues) {
    setApiError(null);
    try {
      const response = await fetch('/api/affiliate/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        setApiError(data.error ?? 'Gagal mendaftar sebagai afiliasi');
        return;
      }
      onJoined();
    } catch {
      setApiError('Gagal mendaftar sebagai afiliasi');
    }
  }

  return (
    <div className={`p-6 ${cardBase}`}>
      <h1 className="text-xl font-bold text-foreground">Jadi Afiliasi</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Bagikan link produk favorit Anda dan dapatkan komisi dari setiap pembelian yang berhasil.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-600">Nama Bank</label>
          <input
            type="text"
            placeholder="Contoh: BCA"
            {...register('payoutBankName')}
            className={inputBase}
          />
          {errors.payoutBankName ? (
            <p className="text-xs text-red">{errors.payoutBankName.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-600">Nomor Rekening</label>
          <input type="text" {...register('payoutBankAccount')} className={inputBase} />
          {errors.payoutBankAccount ? (
            <p className="text-xs text-red">{errors.payoutBankAccount.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-600">Nama Pemilik Rekening</label>
          <input type="text" {...register('payoutBankHolder')} className={inputBase} />
          {errors.payoutBankHolder ? (
            <p className="text-xs text-red">{errors.payoutBankHolder.message}</p>
          ) : null}
        </div>
        {apiError ? <p className="text-sm text-red">{apiError}</p> : null}
        <button type="submit" disabled={isSubmitting} className={`${btnSolid} mt-2`}>
          {isSubmitting ? 'Memproses...' : 'Jadi Afiliasi Sekarang'}
        </button>
      </form>
    </div>
  );
}

function formatCommissionRate(rate: ProductPerformance['commissionRate']): string {
  if (!rate || !rate.isActive) return '-';
  if (rate.fixedAmount !== null) return `${formatCurrency(rate.fixedAmount)}/item`;
  return `${rate.percent}%`;
}

function CopyLinkInput({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access unavailable in this browser/context
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input type="text" readOnly value={link} className={`${inputBase} text-xs`} />
      <button type="button" onClick={handleCopy} className={btnOutline}>
        {copied ? 'Tersalin' : 'Salin'}
      </button>
    </div>
  );
}

export default function MemberAfiliasiPage() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      const response = await fetch('/api/affiliate/stats');
      if (!active) return;

      if (response.status === 404) {
        setIsAffiliate(false);
        setStats(null);
        setLoading(false);
        return;
      }
      if (response.ok) {
        const data: AffiliateStats = await response.json();
        if (!active) return;
        setStats(data);
        setIsAffiliate(true);
      }
      setLoading(false);
    }

    loadStats();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function handleJoined() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat...</p>;
  }

  if (!isAffiliate || !stats) {
    return <OnboardingCard onJoined={handleJoined} />;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Program Afiliasi</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Bagikan link afiliasi. Setiap pembelian melalui link Anda memberi komisi.
          </p>
        </div>
        <Link href="/member/afiliasi/produk" className={btnSolid}>
          Pilih Produk
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`p-4 ${cardBase}`}>
          <p className="text-xs text-neutral-500">Total Klik</p>
          <p className="mt-1 text-xl font-bold text-foreground">{stats.totalClicks}</p>
        </div>
        <div className={`p-4 ${cardBase}`}>
          <p className="text-xs text-neutral-500">Total Konversi</p>
          <p className="mt-1 text-xl font-bold text-foreground">{stats.totalConversions}</p>
        </div>
        <div className={`p-4 ${cardBase}`}>
          <p className="text-xs text-neutral-500">Komisi Pending</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatCurrency(stats.commissionPending)}
          </p>
        </div>
        <div className={`p-4 ${cardBase}`}>
          <p className="text-xs text-neutral-500">Komisi Dibayar</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatCurrency(stats.commissionPaid)}
          </p>
        </div>
      </div>

      <div className={`p-4 ${cardBase}`}>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Komisi per Produk</h2>
        {stats.productPerformance.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Belum ada produk dipilih. Klik &quot;Pilih Produk&quot; untuk memulai.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4">Produk</th>
                  <th className="py-2 pr-4">Tarif Komisi</th>
                  <th className="py-2">Pendapatan Bulan Ini</th>
                </tr>
              </thead>
              <tbody>
                {stats.productPerformance.map((product) => (
                  <tr key={product.productId} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 font-medium text-foreground">{product.title}</td>
                    <td className="py-2 pr-4 text-neutral-600">
                      {formatCommissionRate(product.commissionRate)}
                    </td>
                    <td className="py-2 font-semibold text-foreground">
                      {formatCurrency(product.revenueThisMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Link Afiliasi</h2>
        {stats.productPerformance.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-12 text-center">
            <p className="text-sm text-neutral-500">Anda belum memilih produk afiliasi.</p>
            <Link href="/member/afiliasi/produk" className={btnSolid}>
              Pilih Produk Sekarang
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {stats.productPerformance.map((product) => (
              <div key={product.productId} className={`p-4 ${cardBase}`}>
                <p className="text-sm font-semibold text-foreground">{product.title}</p>
                <div className="mt-2">
                  <CopyLinkInput link={`${origin}/r/${stats.profile.code}?p=${product.slug}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
