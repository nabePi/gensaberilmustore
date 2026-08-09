import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminSessionProvider } from '@/components/admin/AdminSessionContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getAdminSessionUser } from '@/server/auth';

const DEFAULT_ADMIN_EMAIL = 'admin@gensaberilmu.co.id';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getAdminSessionUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };

  return (
    <AdminSessionProvider user={sessionUser}>
      <div className="container-prototype py-8">
        {user.email === DEFAULT_ADMIN_EMAIL ? (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Anda masih menggunakan kredensial admin default. Segera ganti password di halaman
            Pengaturan.
          </div>
        ) : null}

        <details className="mb-6 rounded-lg border border-neutral-200 bg-white lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
            Menu Admin
          </summary>
          <div className="border-t border-neutral-200 px-4 py-4">
            <AdminSidebar user={sessionUser} />
          </div>
        </details>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <AdminSidebar user={sessionUser} />
            </div>
          </aside>

          <div>{children}</div>
        </div>
      </div>
    </AdminSessionProvider>
  );
}
