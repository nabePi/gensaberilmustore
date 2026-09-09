'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { ProductCardData } from '@/components/product/ProductCard';

type WishlistContextValue = {
  items: ProductCardData[];
  loading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggle: (product: ProductCardData) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || fetchedRef.current) return;
    fetchedRef.current = true;

    async function loadWishlist() {
      try {
        const response = await fetch('/api/wishlist');
        if (response.ok) {
          const data: { items: ProductCardData[] } = await response.json();
          setItems(data.items);
        }
      } finally {
        setLoading(false);
      }
    }
    loadWishlist();
  }, [isLoggedIn]);

  function isWishlisted(productId: string) {
    return items.some((item) => item.id === productId);
  }

  async function toggle(product: ProductCardData) {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isWishlisted(product.id)) {
      setItems((current) => current.filter((item) => item.id !== product.id));
      const response = await fetch(`/api/wishlist/${product.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) {
        setItems((current) => [...current, product]);
      }
      return;
    }

    setItems((current) => [...current, product]);
    const response = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    });
    if (!response.ok) {
      setItems((current) => current.filter((item) => item.id !== product.id));
    }
  }

  return (
    <WishlistContext.Provider value={{ items, loading, isWishlisted, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}
