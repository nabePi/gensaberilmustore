'use client';

import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, TableEmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/ui/Table';
import { adminBtnPrimarySm, adminInputBase } from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';

type WithdrawalStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';

type Withdrawal = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  completedAt: string | null;
  bank: { name: string; account: string; holder: string };
  affiliate: { code: string; name: string | null; email: string; phone: string | null };
};

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  REQUESTED: 'Diajukan',
  IN_PROGRESS: 'Diproses',
  COMPLETED: 'Selesai',
};

const STATUS_TONE = {
  REQUESTED: 'neutral',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
} as const;

const NEXT_ACTION: Record<
  Exclude<WithdrawalStatus, 'COMPLETED'>,
  { status: 'IN_PROGRESS' | 'COMPLETED'; label: string; confirm: string }
> = {
  REQUESTED: {
    status: 'IN_PROGRESS',
    label: 'Proses',
    confirm: 'Tandai pencairan ini sedang diproses (transfer akan dilakukan)?',
  },
  IN_PROGRESS: {
    status: 'COMPLETED',
    label: 'Selesaikan',
    confirm: 'Tandai pencairan ini selesai? Pastikan transfer sudah berhasil.',
  },
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminAfiliasiPencairanPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState<'' | WithdrawalStatus>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const response = await fetch(`/api/admin/affiliates/withdrawals?${params.toString()}`);
    if (response.ok) {
      const data: { items: Withdrawal[] } = await response.json();
      setItems(data.items);
      setError(null);
    } else {
      setError('Gagal memuat data pencairan');
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and filter change
    void load();
  }, [load]);

  async function advance(item: Withdrawal) {
    if (item.status === 'COMPLETED') return;
    const action = NEXT_ACTION[item.status];
    if (!window.confirm(action.confirm)) return;

    setBusyId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/affiliates/withdrawals/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? 'Gagal mengubah status');
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const pendingTotal = items
    .filter((item) => item.status !== 'COMPLETED')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pencairan Afiliasi"
        description="Proses pengajuan pencairan komisi dari member afiliasi"
        action={
          <span className="text-sm font-medium text-neutral-500">
            Belum selesai: {formatCurrency(pendingTotal)}
          </span>
        }
      />

      <select
        aria-label="Filter status pencairan"
        value={status}
        onChange={(event) => {
          setLoading(true);
          setStatus(event.target.value as '' | WithdrawalStatus);
        }}
        className={`${adminInputBase} sm:w-56`}
      >
        <option value="">Semua status</option>
        <option value="REQUESTED">Diajukan</option>
        <option value="IN_PROGRESS">Diproses</option>
        <option value="COMPLETED">Selesai</option>
      </select>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat data...</p>
      ) : items.length === 0 ? (
        <TableEmptyState>Belum ada pengajuan pencairan.</TableEmptyState>
      ) : (
        <Table>
          <Thead>
            <Th>Member</Th>
            <Th className="text-right">Jumlah</Th>
            <Th>Rekening Tujuan</Th>
            <Th>Diajukan</Th>
            <Th>Dicairkan</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <Tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td>
                  <p className="font-medium text-foreground">
                    {item.affiliate.name ?? item.affiliate.email}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.affiliate.code}
                    {item.affiliate.phone ? ` · ${item.affiliate.phone}` : ''}
                  </p>
                </Td>
                <Td className="text-right font-semibold text-foreground">
                  {formatCurrency(item.amount)}
                </Td>
                <Td>
                  <p className="text-neutral-700">
                    {item.bank.name} · {item.bank.account}
                  </p>
                  <p className="text-xs text-neutral-500">a.n. {item.bank.holder}</p>
                </Td>
                <Td className="text-neutral-600">{formatDate(item.requestedAt)}</Td>
                <Td className="text-neutral-600">{formatDate(item.completedAt)}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </Td>
                <Td className="text-right">
                  {item.status === 'COMPLETED' ? null : (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => advance(item)}
                      className={adminBtnPrimarySm}
                    >
                      {NEXT_ACTION[item.status].label}
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
