'use client';

import { useEffect, useRef, useState } from 'react';

export type BannerSlide = {
  imageUrl: string;
  linkUrl?: string | null;
  alt?: string;
};

const DRAG_THRESHOLD = 10;
const SWIPE_THRESHOLD = 40;
const AUTO_ADVANCE_MS = 5000;

export function BannerCarousel({
  slides,
  className,
}: {
  slides: BannerSlide[];
  className?: string;
}) {
  const loop = slides.length > 1;
  const extendedSlides: BannerSlide[] = loop
    ? [slides[slides.length - 1]!, ...slides, slides[0]!]
    : slides;
  const maxPosition = extendedSlides.length - 1;

  const [position, setPosition] = useState(loop ? 1 : 0);
  const [dragOffset, setDragOffset] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const dragRef = useRef({ dragging: false, captured: false, startX: 0 });

  useEffect(() => {
    if (!loop) return;
    const timer = setInterval(() => {
      setTransitionOn(true);
      setPosition((prev) => Math.min(maxPosition, prev + 1));
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [loop, maxPosition]);

  useEffect(() => {
    if (!transitionOn) {
      const id = requestAnimationFrame(() => setTransitionOn(true));
      return () => cancelAnimationFrame(id);
    }
  }, [transitionOn]);

  if (slides.length === 0) {
    return null;
  }

  function handleTransitionEnd() {
    if (!loop) return;
    if (position === 0) {
      setTransitionOn(false);
      setPosition(slides.length);
    } else if (position === maxPosition) {
      setTransitionOn(false);
      setPosition(1);
    }
  }

  function endDrag(diff: number) {
    setDragOffset(0);
    setTransitionOn(true);
    if (!loop) return;
    if (diff < -SWIPE_THRESHOLD) setPosition((prev) => Math.min(maxPosition, prev + 1));
    else if (diff > SWIPE_THRESHOLD) setPosition((prev) => Math.max(0, prev - 1));
  }

  const activeIndex = loop ? (position - 1 + slides.length) % slides.length : 0;

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className ?? ''}`}>
      <div
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
          endDrag(event.clientX - dragRef.current.startX);
        }}
        onPointerCancel={() => {
          if (dragRef.current.captured) endDrag(0);
          dragRef.current.dragging = false;
          dragRef.current.captured = false;
        }}
        onPointerLeave={() => {
          if (dragRef.current.captured) endDrag(0);
          dragRef.current.dragging = false;
          dragRef.current.captured = false;
        }}
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateX(calc(-${position * 100}% + ${dragOffset}px))`,
          transition: transitionOn ? 'transform 400ms ease' : 'none',
          touchAction: 'pan-y',
        }}
        className="flex h-full"
      >
        {extendedSlides.map((slide, i) => (
          <div key={i} className="h-full w-full shrink-0">
            {slide.linkUrl ? (
              <a
                href={slide.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageUrl}
                  alt={slide.alt ?? 'Banner promo'}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.imageUrl}
                alt={slide.alt ?? 'Banner promo'}
                className="h-full w-full object-cover"
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>
      {slides.length > 1 ? (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === activeIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
