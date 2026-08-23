'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

function visibleCount(width: number) {
  if (width <= 640) return 2;
  if (width <= 1024) return 4;
  return 6;
}

const DRAG_THRESHOLD = 10;
const SWIPE_THRESHOLD = 40;

export function Carousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [count, setCount] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const dragRef = useRef({ dragging: false, captured: false, startX: 0 });

  function step() {
    const track = trackRef.current;
    const card = track?.children[0];
    if (!track || !card) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function maxIndex(cardCount = count) {
    return Math.max(
      0,
      cardCount - visibleCount(typeof window !== 'undefined' ? window.innerWidth : 0),
    );
  }

  function goTo(next: number, cardCount = count) {
    const clamped = Math.max(0, Math.min(maxIndex(cardCount), next));
    setIndex(clamped);
    setTranslateX(clamped * step());
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const cardCount = track.children.length;
    setCount(cardCount);

    function render() {
      setIndex((current) => {
        const clamped = Math.min(current, maxIndex(cardCount));
        setTranslateX(clamped * step());
        return clamped;
      });
    }

    render();
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="group relative mt-5">
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        disabled={index <= 0}
        aria-label="Sebelumnya"
        className="absolute -left-5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 hover:shadow-md disabled:opacity-0! disabled:pointer-events-none max-[1024px]:-left-2 max-[640px]:left-1 [@media(hover:none)]:opacity-100"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          onPointerDown={(event) => {
            dragRef.current = { dragging: true, captured: false, startX: event.clientX };
          }}
          onPointerMove={(event) => {
            if (!dragRef.current.dragging) return;
            const diff = event.clientX - dragRef.current.startX;
            if (!dragRef.current.captured) {
              if (Math.abs(diff) < DRAG_THRESHOLD) return;
              dragRef.current.captured = true;
              setTransitionOn(false);
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Pointer may no longer be active (e.g. a very fast flick).
              }
            }
            setDragOffset(diff);
          }}
          onPointerUp={(event) => {
            if (!dragRef.current.dragging) return;
            const wasCaptured = dragRef.current.captured;
            dragRef.current.dragging = false;
            dragRef.current.captured = false;
            if (!wasCaptured) return;
            const diff = event.clientX - dragRef.current.startX;
            setDragOffset(0);
            setTransitionOn(true);
            if (diff < -SWIPE_THRESHOLD) goTo(index + 1);
            else if (diff > SWIPE_THRESHOLD) goTo(index - 1);
          }}
          onPointerCancel={() => {
            dragRef.current.dragging = false;
            if (dragRef.current.captured) {
              dragRef.current.captured = false;
              setDragOffset(0);
              setTransitionOn(true);
            }
          }}
          onPointerLeave={() => {
            dragRef.current.dragging = false;
            if (dragRef.current.captured) {
              dragRef.current.captured = false;
              setDragOffset(0);
              setTransitionOn(true);
            }
          }}
          style={{
            transform: `translateX(calc(-${translateX}px + ${dragOffset}px))`,
            transition: transitionOn ? 'transform 450ms cubic-bezier(0.4,0,0.2,1)' : 'none',
            touchAction: 'pan-y',
          }}
          className="flex gap-4 [&>*]:min-w-0 [&>*]:shrink-0 [&>*]:basis-[calc((100%-80px)/6)] max-[1024px]:[&>*]:basis-[calc((100%-48px)/4)] max-[640px]:[&>*]:basis-[calc((100%-16px)/2)]"
        >
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        disabled={index >= maxIndex()}
        aria-label="Selanjutnya"
        className="absolute -right-5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 hover:shadow-md disabled:opacity-0! disabled:pointer-events-none max-[1024px]:-right-2 max-[640px]:right-1 [@media(hover:none)]:opacity-100"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
