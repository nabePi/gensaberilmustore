import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';

import {
  adminTableCell,
  adminTableHeadCell,
  adminTableHeadRow,
  adminTableRow,
  adminTableWrap,
} from '@/lib/admin/styles';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className={adminTableWrap}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className={adminTableHeadRow}>{children}</tr>
    </thead>
  );
}

export function Th({ children, className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`${adminTableHeadCell} ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Tr({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`${adminTableRow} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`${adminTableCell} ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white py-16 text-center shadow-sm">
      <p className="text-sm text-neutral-500">{children}</p>
    </div>
  );
}
