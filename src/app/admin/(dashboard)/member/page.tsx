'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { badgeBase, btnOutline, btnSolidSm, cardBase, inputBase } from '@/lib/styles';

type MemberRole = 'BUYER' | 'AFFILIATE';

type AdminMemberListItem = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: MemberRole;
  createdAt: string;
  orderCount: number;
  totalSpend: number;
};

type MemberOrder = {
  id: string;
  orderNumber: string;
  status: keyof typeof ORDER_STATUS_LABELS;
  total: number;
  createdAt: string;
};

type MemberDetail = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  role: MemberRole;
  createdAt: string;
  orders: MemberOrder[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function MemberDetailModal({
  memberId,
  onClose,
  onChanged,
}: {
  memberId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMember() {
      setLoading(true);
      const response = await fetch(`/api/admin/members/${memberId}`);
      if (response.ok) {
        setMember(await response.json());
      }
      setLoading(false);
    }

    loadMember();
  }, [memberId]);

  async function handleRoleChange(role: MemberRole) {
    setError(null);
    setMessage(null);
    setUpdatingRole(true);
    const response = await fetch(`/api/admin/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await response.json();
    setUpdatingRole(false);

    if (!response.ok) {
      setError(data.error ?? 'Gagal mengubah role');
      return;
    }

    setMember((prev) => (prev ? { ...prev, role: data.role } : prev));
    onChanged();
  }

  async function handleResetPassword() {
    setError(null);
    setMessage(null);
    setResettingPassword(true);
    const response = await fetch(`/api/admin/members/${memberId}/reset-password`, {
      method: 'POST',
    });
    setResettingPassword(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Gagal mengirim reset password');
      return;
    }

    setMessage('Link reset password telah dikirim ke member.');
  }

  return (
    <AdminModal title="Detail Member" onClose={onClose} widthClassName="max-w-xl">
      {loading || !member ? (
        <p className="text-sm text-neutral-500">Memuat detail member...</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-base font-bold text-foreground">{member.name ?? '-'}</p>
            <p className="text-sm text-neutral-500">{member.email}</p>
            <p className="text-sm text-neutral-500">{member.phone ?? '-'}</p>
            <p className="mt-1 text-xs text-neutral-400">
              Bergabung {formatDate(member.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-y border-neutral-200 py-3">
            <span className="text-sm font-medium text-neutral-600">Role saat ini:</span>
            <span className={`${badgeBase} bg-brand-50 text-brand`}>{member.role}</span>
            {member.role === 'BUYER' ? (
              <button
                type="button"
                disabled={updatingRole}
                onClick={() => handleRoleChange('AFFILIATE')}
                className={btnSolidSm}
              >
                Jadikan Afiliasi
              </button>
            ) : (
              <button
                type="button"
                disabled={updatingRole}
                onClick={() => handleRoleChange('BUYER')}
                className={btnSolidSm}
              >
                Jadikan Buyer
              </button>
            )}
            <button
              type="button"
              disabled={resettingPassword}
              onClick={handleResetPassword}
              className={btnOutline}
            >
              {resettingPassword ? 'Mengirim...' : 'Reset Password'}
            </button>
          </div>

          {message ? <p className="text-sm text-green">{message}</p> : null}
          {error ? <p className="text-sm text-red">{error}</p> : null}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Riwayat Pesanan</h3>
            {member.orders.length === 0 ? (
              <p className="text-sm text-neutral-500">Belum ada pesanan.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {member.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-neutral-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`${badgeBase} ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminModal>
  );
}

export default function AdminMemberPage() {
  const [members, setMembers] = useState<AdminMemberListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const limit = 20;

  async function loadMembers() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.trim()) params.set('q', q.trim());

    const response = await fetch(`/api/admin/members?${params.toString()}`);
    if (response.ok) {
      const data: { items: AdminMemberListItem[]; total: number } = await response.json();
      setMembers(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q.trim()) params.set('q', q.trim());

      const response = await fetch(`/api/admin/members?${params.toString()}`);
      if (response.ok) {
        const data: { items: AdminMemberListItem[]; total: number } = await response.json();
        setMembers(data.items);
        setTotal(data.total);
      }
      setLoading(false);
    }

    load();
  }, [q, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kelola Member</h1>
        <p className="mt-1 text-sm text-neutral-500">{total} member ditemukan</p>
      </div>

      <input
        type="search"
        placeholder="Cari nama atau email"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        className={`${inputBase} sm:w-80`}
      />

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat member...</p>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">Tidak ada member ditemukan.</p>
        </div>
      ) : (
        <div className={`overflow-x-auto ${cardBase}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Jumlah Order</th>
                <th className="px-4 py-3 text-right">Total Belanja</th>
                <th className="px-4 py-3">Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => setOpenMemberId(member.id)}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{member.name ?? '-'}</p>
                    <p className="text-xs text-neutral-400">{member.email}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{member.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`${badgeBase} bg-brand-50 text-brand`}>{member.role}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">{member.orderCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatCurrency(member.totalSpend)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(member.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={btnOutline}
          >
            Sebelumnya
          </button>
          <span className="text-sm text-neutral-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={btnSolidSm}
          >
            Selanjutnya
          </button>
        </div>
      ) : null}

      {openMemberId ? (
        <MemberDetailModal
          memberId={openMemberId}
          onClose={() => setOpenMemberId(null)}
          onChanged={loadMembers}
        />
      ) : null}
    </div>
  );
}
