'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/admin/ui/PageHeader';
import { VoucherForm, type AdminVoucherDetail } from '@/components/admin/VoucherForm';

export default function AdminVoucherEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [voucher, setVoucher] = useState<AdminVoucherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/admin/vouchers/${params.id}`);
      if (response.ok) {
        setVoucher(await response.json());
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    load();
  }, [params.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit Voucher"
        breadcrumb={[{ label: 'Voucher', href: '/admin/voucher' }, { label: 'Edit Voucher' }]}
      />
      {loading ? (
        <p className="text-sm text-neutral-500">Memuat voucher...</p>
      ) : notFound || !voucher ? (
        <p className="text-sm text-neutral-500">Voucher tidak ditemukan.</p>
      ) : (
        <VoucherForm
          voucher={voucher}
          onCancel={() => router.push('/admin/voucher')}
          onSaved={() => router.push('/admin/voucher')}
        />
      )}
    </div>
  );
}
