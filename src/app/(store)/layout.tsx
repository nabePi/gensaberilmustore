import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getSessionUser } from '@/server/auth';

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader initialUser={user ? { id: user.id, name: user.name, email: user.email } : null} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
