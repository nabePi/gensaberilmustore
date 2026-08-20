'use client';

import { useEffect, useState } from 'react';

export type BannerSlide = {
  imageUrl: string;
  linkUrl?: string | null;
  alt?: string;
};

export function BannerCarousel({
  slides,
  className,
}: {
  slides: BannerSlide[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);

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

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.imageUrl}
      alt={slide.alt ?? 'Banner promo'}
      className="h-full w-full object-cover transition-opacity duration-500"
    />
  );

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className ?? ''}`}>
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
