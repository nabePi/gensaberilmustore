import type { ReactNode } from 'react';

import { adminCardBase, adminCardPad } from '@/lib/admin/styles';

export function Card({
  title,
  action,
  padded = true,
  className = '',
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${adminCardBase} ${className}`}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-4 sm:px-6">
          {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : <div />}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={padded ? adminCardPad : ''}>{children}</div>
    </div>
  );
}
