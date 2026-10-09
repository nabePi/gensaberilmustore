'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, TableEmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/ui/Table';
import { adminBtnOutlineSm, adminBtnPrimarySm, adminInputBase } from '@/lib/admin/styles';

type ApprovalStatus = 'PENDING' | 'APPROVED';
type SortKey = 'joinedAt' | 'name' | 'email' | 'code' | 'status' | 'isActive';

type AffiliateMember = {
  id: string;
  code: string;
  status: ApprovalStatus;
  isActive: boolean;
  joinedAt: string;
  payoutBankName: string;
  payoutBankAccount: string;
  payoutBankHolder: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
};

const PAGE_SIZES = [10, 25, 50, 100];

function SortTh({
  label,
  field,
  sort,
  order,
  onSort,
}: {
  label: string;
  field: SortKey;
  sort: SortKey;
  order: 'asc' | 'desc';
  onSort: (field: SortKey) => void;
}) {
  const active = sort === field;
  return (
    <Th aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 font-inherit uppercase hover:text-foreground"
      >
        {label}
        <span aria-hidden className={active ? 'text-brand' : 'text-neutral-300'}>
          {active ? (order === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </Th>
  );
}

export default function AdminAfiliasiMemberPage() {
  const [items, setItems] = useState<AffiliateMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | ApprovalStatus>('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [sort, setSort] = useState<SortKey>('joinedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
        order,
      });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (active) params.set('active', active);

      const response = await fetch(`/api/admin/affiliates/members?${params.toString()}`);
      if (response.ok) {
        const data: { items: AffiliateMember[]; total: number } = await response.json();
        setItems(data.items);
        setTotal(data.total);
        setError(null);
      } else {
        setError('Gagal memuat data member afiliasi');
      }
      setLoading(false);
    }

    load();
  }, [page, limit, sort, order, q, status, active, reloadKey]);

  function handleSort(field: SortKey) {
    if (field === sort) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder(field === 'joinedAt' ? 'desc' : 'asc');
    }
    setPage(1);
  }

  async function updateMember(id: string, body: { status?: 'APPROVED'; isActive?: boolean }) {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/admin/affiliates/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusyId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? 'Gagal memperbarui member afiliasi');
      return;
    }
    setReloadKey((key) => key + 1);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Member Afiliasi"
        description="Setujui pendaftar dan atur aktif/nonaktif akun afiliasi"
        action={<span className="text-sm font-medium text-neutral-500">{total} member</span>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          aria-label="Cari member afiliasi"
          placeholder="Cari nama, email, telepon, atau kode"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={`${adminInputBase} sm:w-80`}
        />
        <select
          aria-label="Filter persetujuan"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | ApprovalStatus);
            setPage(1);
          }}
          className={`${adminInputBase} sm:w-48`}
        >
          <option value="">Semua persetujuan</option>
          <option value="PENDING">Menunggu</option>
          <option value="APPROVED">Disetujui</option>
        </select>
        <select
          aria-label="Filter status akun"
          value={active}
          onChange={(e) => {
            setActive(e.target.value as '' | 'true' | 'false');
            setPage(1);
          }}
          className={`${adminInputBase} sm:w-44`}
        >
          <option value="">Semua akun</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="text-sm text-neutral-500">Memuat member...</p>
      ) : items.length === 0 ? (
        <TableEmptyState>Tidak ada member afiliasi ditemukan.</TableEmptyState>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table>
            <Thead>
              <SortTh label="Member" field="name" sort={sort} order={order} onSort={handleSort} />
              <SortTh label="Kode" field="code" sort={sort} order={order} onSort={handleSort} />
              <Th>Rekening</Th>
              <SortTh
                label="Persetujuan"
                field="status"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
              <SortTh label="Akun" field="isActive" sort={sort} order={order} onSort={handleSort} />
              <SortTh
                label="Bergabung"
                field="joinedAt"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
              <Th />
            </Thead>
            <Tbody>
              {items.map((member) => (
                <Tr key={member.id}>
                  <Td>
                    <p className="font-medium text-foreground">
                      {member.user.name ?? member.user.email}
                    </p>
                    <p className="text-xs text-neutral-500">{member.user.email}</p>
                    {member.user.phone ? (
                      <p className="text-xs text-neutral-400">{member.user.phone}</p>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-xs text-neutral-600">{member.code}</Td>
                  <Td className="text-xs text-neutral-600">
                    <p>
                      {member.payoutBankName} · {member.payoutBankAccount}
                    </p>
                    <p className="text-neutral-400">a.n. {member.payoutBankHolder}</p>
                  </Td>
                  <Td>
                    <Badge tone={member.status === 'APPROVED' ? 'success' : 'warning'}>
                      {member.status === 'APPROVED' ? 'Disetujui' : 'Menunggu'}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={member.isActive ? 'success' : 'neutral'}>
                      {member.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </Td>
                  <Td className="text-neutral-600">
                    {new Date(member.joinedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/afiliasi/member/${member.id}`}
                        className={adminBtnOutlineSm}
                      >
                        Detail
                      </Link>
                      {member.status === 'PENDING' ? (
                        <button
                          type="button"
                          disabled={busyId === member.id}
                          onClick={() => updateMember(member.id, { status: 'APPROVED' })}
                          className={adminBtnPrimarySm}
                        >
                          Setujui
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => updateMember(member.id, { isActive: !member.isActive })}
                        className={adminBtnOutlineSm}
                      >
                        {member.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <label htmlFor="affMemberLimit">Tampilkan</label>
          <select
            id="affMemberLimit"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className={`${adminInputBase} !h-9 !w-20 !px-2 !py-1`}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>
            {from}–{to} dari {total}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={adminBtnOutlineSm}
          >
            Sebelumnya
          </button>
          <span className="text-sm text-neutral-600">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={adminBtnOutlineSm}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
