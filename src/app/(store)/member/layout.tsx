import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { MemberSessionProvider } from '@/components/member/MemberSessionContext';
import { MemberSidebar } from '@/components/member/MemberSidebar';
import { getSessionUser } from '@/server/auth';

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };

  return (
    <MemberSessionProvider user={sessionUser}>
      <div className="container-prototype py-8">
        <details className="mb-6 rounded-lg border border-neutral-200 bg-white lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
            Menu Akun
          </summary>
          <div className="border-t border-neutral-200 px-4 py-4">
            <MemberSidebar user={sessionUser} />
          </div>
        </details>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <MemberSidebar user={sessionUser} />
            </div>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </MemberSessionProvider>
  );
}
