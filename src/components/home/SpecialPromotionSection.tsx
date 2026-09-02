import Link from 'next/link';

import { ProductCard, type ProductCardData } from '@/components/product/ProductCard';
import { Carousel } from '@/components/ui/Carousel';

export function SpecialPromotionSection({
  title,
  subtitle,
  viewAllHref,
  products,
  backgroundColor = '#dc2626',
  titleColor = '#ffffff',
}: {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  products: ProductCardData[];
  backgroundColor?: string;
  titleColor?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="relative left-1/2 w-screen -mx-[50vw] py-10" style={{ backgroundColor }}>
      <div className="container-prototype">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke={titleColor}
                strokeWidth={2}
              >
                <circle cx="7" cy="7" r="3" />
                <circle cx="17" cy="17" r="3" />
                <path strokeLinecap="round" d="M18 6L6 18" />
              </svg>
            </span>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: titleColor }}>
                {title}
              </h2>
              {subtitle ? (
                <p className="text-[15px]" style={{ color: titleColor, opacity: 0.85 }}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <Link
            href={viewAllHref}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold hover:bg-white/10"
            style={{ color: titleColor, borderColor: titleColor }}
          >
            Lihat Semua <span>&rarr;</span>
          </Link>
        </div>
        <Carousel>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
