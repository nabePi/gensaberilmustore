'use client';

import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/admin/ui/PageHeader';
import { VoucherForm } from '@/components/admin/VoucherForm';

export default function AdminVoucherBaruPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tambah Voucher"
        breadcrumb={[{ label: 'Voucher', href: '/admin/voucher' }, { label: 'Tambah Voucher' }]}
      />
      <VoucherForm
        voucher={null}
        onCancel={() => router.push('/admin/voucher')}
        onSaved={() => router.push('/admin/voucher')}
      />
    </div>
  );
}
