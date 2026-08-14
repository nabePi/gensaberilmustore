'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { CART_UPDATED_EVENT } from '@/lib/cart-events';
import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid } from '@/lib/styles';

export type HeaderUser = {
  id: string;
  name: string | null;
  email: string;
};

type SearchSuggestion = {
  id: string;
  slug: string;
  title: string;
  finalPrice: number;
  imageUrl: string | null;
};

const LOGO_URL =
  'https://d33tu7komhhdsg.cloudfront.net/fL0bTwfYBTXRta-Ne8XDN_vScOqHAKlW4IHMcivnhbI/auto/0/250/no/1/bG9jYWw6Ly8vYnVzaW5lc3MvMjAyMS0xMi9neTZlZThjZWUwOTI0MGUyNmFhYWNlL2FsYnVtcy9wcm9maWxlL3BkZnRvanBnbWUtMS1jdXRvdXQucG5n.webp';

export function SiteHeader({ initialUser }: { initialUser: HeaderUser | null }) {
  const router = useRouter();
  const [user, setUser] = useState<HeaderUser | null>(initialUser);
  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function refreshCart() {
      try {
        const response = await fetch('/api/cart');
        if (!response.ok || !active) return;
        const data: { itemCount: number } = await response.json();
        if (active) setCartCount(data.itemCount);
      } catch {
        // ignore network errors for the cart badge
      }
    }

    refreshCart();
    window.addEventListener(CART_UPDATED_EVENT, refreshCart);
    return () => {
      active = false;
      window.removeEventListener(CART_UPDATED_EVENT, refreshCart);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    const timer = setTimeout(
      async () => {
        if (trimmed.length < 2) {
          setSuggestions([]);
          return;
        }

        try {
          const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`);
          if (!response.ok) return;
          const data: { suggestions: SearchSuggestion[] } = await response.json();
          setSuggestions(data.suggestions);
          setSuggestOpen(true);
        } catch {
          // ignore network errors for autocomplete
        }
      },
      trimmed.length < 2 ? 0 : 250,
    );

    return () => clearTimeout(timer);
  }, [query]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSuggestOpen(false);
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setUserMenuOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="container-prototype flex items-center gap-8 py-3.5">
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0">
            <img src={LOGO_URL} alt="GenSa Berilmu" className="h-[50px] w-auto object-contain" />
          </Link>
          <nav className="hidden items-center gap-[22px] lg:flex">
            <Link
              href="/"
              className="px-0.5 py-2 text-[15px] font-medium text-neutral-700 hover:text-brand"
            >
              Beranda
            </Link>
            <Link
              href="/products"
              className="px-0.5 py-2 text-[15px] font-medium text-neutral-700 hover:text-brand"
            >
              Produk
            </Link>
            <Link
              href="/kids"
              className="px-0.5 py-2 text-[15px] font-medium text-neutral-700 hover:text-brand"
            >
              Buku Anak
            </Link>
          </nav>
        </div>

        <div ref={searchBoxRef} className="relative hidden flex-1 md:block">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center rounded-md border border-neutral-200 bg-white px-4 py-2.5 shadow-xs"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-neutral-400"
              fill="currentColor"
            >
              <path d="M10 4a6 6 0 104.47 10.03l4.75 4.75 1.41-1.41-4.75-4.75A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
              placeholder="Cari produk, penulis, atau kategori..."
              className="w-full bg-transparent px-3 text-sm outline-none"
            />
          </form>
          {suggestOpen && suggestions.length > 0 ? (
            <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-sm border border-neutral-200 bg-white py-2 shadow-lg">
              {suggestions.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug}`}
                  onClick={() => setSuggestOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-brand-50"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="h-10 w-8 object-cover" />
                  ) : (
                    <div className="h-10 w-8 bg-neutral-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{item.title}</p>
                    <p className="text-xs font-semibold text-brand">
                      {formatCurrency(item.finalPrice)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/cart"
            aria-label="Keranjang"
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-50"
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.331 8H17.67a2 2 0 0 1 1.977 2.304l-1.255 8.152A3 3 0 0 1 15.426 21H8.574a3 3 0 0 1-2.965-2.544l-1.255-8.152A2 2 0 0 1 6.331 8" />
              <path d="M9 11V6a3 3 0 0 1 6 0v5" />
            </svg>
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>

          {user ? (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-sm border border-neutral-200 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                {user.name ?? user.email}
              </button>
              {userMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-sm border border-neutral-200 bg-white py-2 shadow-lg">
                  <Link
                    href="/member/dashboard"
                    className="block px-4 py-2 text-sm hover:bg-brand-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-red hover:bg-brand-50"
                  >
                    Keluar
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className={btnOutline}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                Masuk
              </Link>
              <Link href="/signup" className={btnSolid}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
                Daftar
              </Link>
            </div>
          )}

          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          >
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 lg:hidden">
          <form
            onSubmit={handleSearchSubmit}
            className="mb-4 flex items-center rounded-md border border-neutral-200 bg-white px-4 py-2.5 shadow-xs"
          >
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari produk..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </form>
          <nav className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium text-neutral-700"
            >
              Beranda
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium text-neutral-700"
            >
              Produk
            </Link>
            <Link
              href="/kids"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium text-neutral-700"
            >
              Buku Anak
            </Link>
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href="/member/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={btnOutline}
                >
                  Dashboard
                </Link>
                <button type="button" onClick={handleLogout} className={btnSolid}>
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className={btnOutline}>
                  Masuk
                </Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className={btnSolid}>
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
