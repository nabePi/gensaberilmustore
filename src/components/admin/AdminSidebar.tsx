'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import type { AdminSessionUser } from '@/components/admin/AdminSessionContext';
import { btnOutline } from '@/lib/styles';

type NavItem =
  | { href: string; label: string }
  | { href: string; label: string; children: { href: string; label: string }[] };

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/pesanan', label: 'Pesanan' },
  { href: '/admin/board', label: 'Board' },
  { href: '/admin/fulfillment', label: 'Fulfillment' },
  { href: '/admin/produk', label: 'Produk' },
  { href: '/admin/kategori', label: 'Kategori' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/member', label: 'Member' },
  { href: '/admin/pos', label: 'POS' },
  { href: '/admin/afiliasi', label: 'Afiliasi' },
  { href: '/admin/voucher', label: 'Voucher' },
  { href: '/admin/laporan', label: 'Laporan' },
  { href: '/admin/laporan-lengkap', label: 'Laporan Lengkap' },
  {
    href: '/admin/konfigurasi',
    label: 'Konfigurasi',
    children: [
      { href: '/admin/konfigurasi', label: 'Umum' },
      { href: '/admin/konfigurasi/section', label: 'Section' },
      { href: '/admin/konfigurasi/kids', label: 'Kids' },
      { href: '/admin/konfigurasi/kids/section', label: 'Kids Section' },
    ],
  },
  { href: '/admin/pengaturan', label: 'Pengaturan' },
];

export function AdminSidebar({ user }: { user: AdminSessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Konfigurasi: true });

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  const displayName = user.name ?? user.email;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-neutral-500">{user.email}</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if ('children' in item) {
            const isExpanded = expanded[item.label] ?? false;
            return (
              <div key={item.href}>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [item.label]: !prev[item.label] }))
                  }
                  className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors ${
                    active ? 'bg-brand-50 text-brand' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {item.label}
                  <span className="text-xs">{isExpanded ? '▾' : '▸'}</span>
                </button>
                {isExpanded ? (
                  <div className="ml-3 flex flex-col border-l border-neutral-200 pl-2">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`rounded-sm px-3 py-2 text-sm transition-colors ${
                            childActive
                              ? 'bg-brand-50 font-medium text-brand'
                              : 'text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-brand-50 text-brand' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button type="button" onClick={handleLogout} disabled={loggingOut} className={btnOutline}>
        Keluar
      </button>
    </div>
  );
}
