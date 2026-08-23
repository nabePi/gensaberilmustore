'use client';

import { useCallback, useRef, useState } from 'react';

export type GalleryImage = { id: string; url: string; altText: string | null };

const DRAG_THRESHOLD = 10;
const SWIPE_THRESHOLD = 40;

export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const dragRef = useRef({ dragging: false, captured: false, startX: 0 });
  const hasMany = images.length > 1;

  const clamp = useCallback(
    (index: number) => Math.max(0, Math.min(images.length - 1, index)),
    [images.length],
  );

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(clamp(index));
    },
    [clamp],
  );

  function endDrag(diff: number) {
    setDragOffset(0);
    setTransitionOn(true);
    if (diff < -SWIPE_THRESHOLD) goTo(activeIndex + 1);
    else if (diff > SWIPE_THRESHOLD) goTo(activeIndex - 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
        {images.length > 0 ? (
          <div
            onPointerDown={(event) => {
              if (!hasMany) return;
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
            style={{
              transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
              transition: transitionOn ? 'transform 300ms ease' : 'none',
              touchAction: 'pan-y',
            }}
            className="flex h-full"
          >
            {images.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.id}
                src={image.url}
                alt={image.altText ?? title}
                className="h-full w-full shrink-0 object-cover"
                draggable={false}
              />
            ))}
          </div>
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-neutral-400">
            Tanpa Gambar
          </span>
        )}

        {hasMany ? (
          <>
            {activeIndex > 0 ? (
              <button
                type="button"
                aria-label="Gambar sebelumnya"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md transition hover:bg-white lg:flex"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            ) : null}
            {activeIndex < images.length - 1 ? (
              <button
                type="button"
                aria-label="Gambar berikutnya"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md transition hover:bg-white lg:flex"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            ) : null}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Gambar ${index + 1}`}
                  onClick={() => goTo(index)}
                  className={`h-2 w-2 rounded-full transition ${
                    index === activeIndex ? 'bg-brand' : 'bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {hasMany ? (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => goTo(index)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-sm border-2 ${
                index === activeIndex ? 'border-brand' : 'border-neutral-200'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.altText ?? title}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
