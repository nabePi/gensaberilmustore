'use client';

import type { ReactNode } from 'react';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminSidebarProvider, useAdminSidebar } from '@/components/admin/AdminSidebarContext';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ChevronDownIcon } from '@/components/admin/ui/icons';

function AdminShellInner({ children }: { children: ReactNode }) {
  const { collapsed } = useAdminSidebar();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside
        className={`fixed inset-y-0 z-40 hidden flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-neutral-200 px-6">
          <span className="text-lg font-bold text-brand">{collapsed ? 'GS' : 'GenSa Admin'}</span>
        </div>
        <div className={`flex-1 overflow-y-auto py-6 ${collapsed ? 'px-2' : 'px-4'}`}>
          <AdminSidebar collapsed={collapsed} />
        </div>
      </aside>

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <AdminTopbar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <details className="group mb-6 rounded-xl border border-neutral-200 bg-white lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-foreground">
              Menu Admin
              <ChevronDownIcon className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-neutral-200 px-4 py-4">
              <AdminSidebar />
            </div>
          </details>

          <div className="min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminSidebarProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminSidebarProvider>
  );
}
