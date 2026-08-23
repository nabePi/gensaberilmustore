'use client';

import { useEffect, useRef, useState } from 'react';

export type BannerSlide = {
  imageUrl: string;
  linkUrl?: string | null;
  alt?: string;
};

const DRAG_THRESHOLD = 10;
const SWIPE_THRESHOLD = 40;

export function BannerCarousel({
  slides,
  className,
}: {
  slides: BannerSlide[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const dragRef = useRef({ dragging: false, captured: false, startX: 0 });

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[index];

  if (!slide) {
    return null;
  }

  function goTo(next: number) {
    setIndex(((next % slides.length) + slides.length) % slides.length);
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.imageUrl}
      alt={slide.alt ?? 'Banner promo'}
      className="h-full w-full object-cover transition-opacity duration-500"
      draggable={false}
    />
  );

  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 ${className ?? ''}`}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(event) => {
        dragRef.current = { dragging: true, captured: false, startX: event.clientX };
      }}
      onPointerMove={(event) => {
        if (!dragRef.current.dragging || dragRef.current.captured) return;
        const diff = event.clientX - dragRef.current.startX;
        if (Math.abs(diff) >= DRAG_THRESHOLD) {
          dragRef.current.captured = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerUp={(event) => {
        if (!dragRef.current.dragging) return;
        const wasCaptured = dragRef.current.captured;
        dragRef.current.dragging = false;
        dragRef.current.captured = false;
        if (!wasCaptured || slides.length <= 1) return;
        const diff = event.clientX - dragRef.current.startX;
        if (diff < -SWIPE_THRESHOLD) goTo(index + 1);
        else if (diff > SWIPE_THRESHOLD) goTo(index - 1);
      }}
      onPointerCancel={() => {
        dragRef.current.dragging = false;
        dragRef.current.captured = false;
      }}
      onPointerLeave={() => {
        dragRef.current.dragging = false;
        dragRef.current.captured = false;
      }}
    >
      {slide.linkUrl ? (
        <a href={slide.linkUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
          {image}
        </a>
      ) : (
        image
      )}
      {slides.length > 1 ? (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
