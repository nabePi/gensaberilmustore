'use client';

import { useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import {
  adminBtnOutline,
  adminBtnPrimary,
  adminErrorText,
  adminHelpText,
  adminInputBase,
  adminLabelBase,
} from '@/lib/admin/styles';
import type { LandingChange } from '@/lib/landing/diff';

export function PublishDialog({
  changes,
  publishing,
  error,
  onCancel,
  onConfirm,
}: {
  changes: LandingChange[];
  publishing: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (message: string) => void;
}) {
  const [message, setMessage] = useState('content(landing): perbarui konten landing page');
  const grouped = changes.reduce<Record<string, string[]>>((acc, change) => {
    (acc[change.section] ??= []).push(change.text);
    return acc;
  }, {});

  return (
    <AdminModal
      title="Commit & Push ke GitHub"
      onClose={publishing ? () => undefined : onCancel}
      widthClassName="max-w-xl"
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-neutral-600">
          Perubahan di bawah akan di-commit ke repo landing page. Setelah push, situs{' '}
          <strong>otomatis ter-deploy</strong> dan langsung tampil di gensaberilmu.com.
        </p>

        <div>
          <p className={adminLabelBase}>{changes.length} perubahan</p>
          <div className="mt-2 flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-200 p-3">
            {Object.entries(grouped).map(([section, items]) => (
              <div key={section}>
                <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                  {section}
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm text-neutral-700">
                  {items.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={adminLabelBase}>Pesan commit</span>
          <input
            className={adminInputBase}
            value={message}
            maxLength={200}
            onChange={(event) => setMessage(event.target.value)}
          />
          <span className={adminHelpText}>Nama Anda otomatis ditambahkan di badan commit.</span>
        </label>

        {error ? (
          <p className={adminErrorText} role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={adminBtnOutline}
            onClick={onCancel}
            disabled={publishing}
          >
            Batal
          </button>
          <button
            type="button"
            className={adminBtnPrimary}
            disabled={publishing || message.trim().length < 3}
            onClick={() => onConfirm(message.trim())}
          >
            {publishing ? 'Mengirim…' : 'Commit & Push'}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
