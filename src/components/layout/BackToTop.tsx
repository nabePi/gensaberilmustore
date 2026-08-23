'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const SHOW_AFTER_SCROLL_Y = 400;
const DESKTOP_VISIBLE_PATHS = ['/products'];

export function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > SHOW_AFTER_SCROLL_Y);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  const visibleOnDesktop = DESKTOP_VISIBLE_PATHS.includes(pathname);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Kembali ke atas"
      className={`fixed right-4 bottom-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-colors hover:bg-[#c95d00] ${visibleOnDesktop ? '' : 'lg:hidden'}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
