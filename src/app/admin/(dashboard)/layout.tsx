import { Outfit } from 'next/font/google';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminSessionProvider } from '@/components/admin/AdminSessionContext';
import { AdminShell } from '@/components/admin/AdminShell';
import { getAdminSessionUser } from '@/server/auth';

const outfit = Outfit({ subsets: ['latin'] });

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
      <div className={outfit.className}>
        <AdminShell showDefaultCredentialWarning={user.email === DEFAULT_ADMIN_EMAIL}>
          {children}
        </AdminShell>
      </div>
    </AdminSessionProvider>
  );
}
