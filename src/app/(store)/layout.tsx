import type { ReactNode } from 'react';

import { CartFlyToast } from '@/components/cart/CartFlyToast';
import { BackToTop } from '@/components/layout/BackToTop';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { MobileRecommendedProducts } from '@/components/product/MobileRecommendedProducts';
import { getSessionUser } from '@/server/auth';

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <SiteHeader initialUser={user ? { id: user.id, name: user.name, email: user.email } : null} />
      <main className="flex-1">{children}</main>
      <MobileRecommendedProducts />
      <SiteFooter />
      <BackToTop />
      <MobileBottomNav isLoggedIn={!!user} />
      <CartFlyToast />
    </div>
  );
}
