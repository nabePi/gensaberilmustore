import Link from 'next/link';

export function SectionHead({
  title,
  subtitle,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="mb-1.5 text-2xl font-bold text-foreground">{title}</h2>
        {subtitle ? <p className="text-[15px] text-neutral-500">{subtitle}</p> : null}
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-foreground hover:bg-neutral-50"
        >
          Lihat Semua <span>&rarr;</span>
        </Link>
      ) : null}
    </div>
  );
}
