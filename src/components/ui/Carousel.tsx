'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';

const SCROLL_STEP_PX = 320;

export function Carousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Sebelumnya"
        className="absolute left-0 top-1/2 z-10 hidden -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full bg-white border border-neutral-200 shadow-md h-9 w-9 hover:bg-neutral-50 md:flex"
      >
        ‹
      </button>
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Selanjutnya"
        className="absolute right-0 top-1/2 z-10 hidden translate-x-3 -translate-y-1/2 items-center justify-center rounded-full bg-white border border-neutral-200 shadow-md h-9 w-9 hover:bg-neutral-50 md:flex"
      >
        ›
      </button>
    </div>
  );
}
