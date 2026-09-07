'use client';

import type { ReactNode } from 'react';

import { CloseIcon } from '@/components/admin/ui/icons';

export function AdminModal({
  title,
  onClose,
  children,
  widthClassName = 'max-w-lg',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-950/50 p-4 py-10 backdrop-blur-[2px]">
      <div
        className={`w-full ${widthClassName} rounded-2xl border border-neutral-200 bg-white shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
