'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { useAdminSidebar } from '@/components/admin/AdminSidebarContext';
import { ChevronDownIcon, LogoutIcon, MenuIcon } from '@/components/admin/ui/icons';

export function AdminTopbar() {
  const user = useAdminSession();
  const { toggleCollapsed } = useAdminSidebar();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user.name ?? user.email;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Tampilkan/sembunyikan menu"
          className="hidden rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 lg:inline-flex"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-foreground">Panel Admin</p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 text-left transition-colors hover:bg-neutral-100"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden text-sm sm:block">
            <span className="block max-w-[140px] truncate font-medium text-foreground">
              {displayName}
            </span>
            <span className="block max-w-[140px] truncate text-xs text-neutral-500">
              {user.email}
            </span>
          </span>
          <ChevronDownIcon
            className={`hidden h-4 w-4 shrink-0 text-neutral-400 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {menuOpen ? (
          <>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
              <div className="border-b border-neutral-100 px-3 py-2 sm:hidden">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-neutral-500">{user.email}</p>
              </div>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50"
              >
                <LogoutIcon className="h-4 w-4" />
                {loggingOut ? 'Keluar...' : 'Keluar'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
