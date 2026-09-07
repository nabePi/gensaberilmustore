import type { ReactNode } from 'react';

import { adminCardBase } from '@/lib/admin/styles';

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className={`p-5 ${adminCardBase}`}>
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand">
          {icon}
        </div>
      ) : null}
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
