'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11.5 12 4l9 7.5M5 9.5V19a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function ProductIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function BlogIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5.5c2-1 5-1 8 .5 3-1.5 6-1.5 8-.5v13c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5Z" />
      <path d="M12 6v13" />
    </svg>
  );
}

function WishlistIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 1.8 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7.5-4.7-10-9.3C.5 8.1 2.6 4 6.4 4c2 0 3.8 1.1 4.9 2.8C12.4 5.1 14.2 4 16.2 4 20 4 22.1 8.1 21.5 11.7 19 16.3 12 21 12 21z" />
    </svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.5-3.5 4.5-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

export function MobileBottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Beranda', Icon: HomeIcon, active: pathname === '/' },
    {
      href: '/products',
      label: 'Produk',
      Icon: ProductIcon,
      active: pathname.startsWith('/products'),
    },
    { href: '/blog', label: 'Blog', Icon: BlogIcon, active: pathname.startsWith('/blog') },
    { href: '/wishlist', label: 'Wishlist', Icon: WishlistIcon, active: pathname === '/wishlist' },
    {
      href: isLoggedIn ? '/member/dashboard' : '/login',
      label: 'Akun',
      Icon: AccountIcon,
      active: pathname.startsWith('/member') || pathname === '/login',
    },
  ];

  const activeIndex = items.findIndex((item) => item.active);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="relative grid grid-cols-5">
        {activeIndex !== -1 && (
          <div
            className="absolute top-0 left-0 h-0.5 w-1/5 px-3 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="block h-full w-full rounded-full bg-brand" />
          </div>
        )}
        {items.map(({ href, label, Icon, active }) => (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
              active ? 'text-brand' : 'text-neutral-500'
            }`}
          >
            <Icon active={active} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
