import Link from 'next/link';

import { ChevronRightIcon } from '@/components/admin/ui/icons';

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
      <Link href="/admin" className="hover:text-brand">
        Dashboard
      </Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
          {item.href ? (
            <Link href={item.href} className="hover:text-brand">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
