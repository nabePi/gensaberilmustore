'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import type { MemberSessionUser } from '@/components/member/MemberSessionContext';
import { btnOutline } from '@/lib/styles';

const NAV_ITEMS = [
  { href: '/member/dashboard', label: 'Dashboard' },
  { href: '/member/profil', label: 'Profil Saya' },
  { href: '/member/transaksi', label: 'Riwayat Transaksi' },
  { href: '/member/afiliasi', label: 'Afiliasi' },
  { href: '/member/penerima', label: 'Penerima' },
];

export function MemberSidebar({ user }: { user: MemberSessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
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

      <button type="button" onClick={handleLogout} className={btnOutline}>
        Keluar
      </button>
    </div>
  );
}
