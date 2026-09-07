import type { ReactNode } from 'react';

import { type AdminBadgeTone, adminBadgeTone } from '@/lib/admin/styles';

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: AdminBadgeTone;
  children: ReactNode;
}) {
  return <span className={adminBadgeTone(tone)}>{children}</span>;
}
