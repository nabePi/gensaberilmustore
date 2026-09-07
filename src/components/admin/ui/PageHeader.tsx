import type { ReactNode } from 'react';

import { type BreadcrumbItem, Breadcrumb } from '@/components/admin/ui/Breadcrumb';

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
}: {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumb ? (
          <div className="mb-1.5">
            <Breadcrumb items={breadcrumb} />
          </div>
        ) : null}
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
