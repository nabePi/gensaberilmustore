'use client';

import { useEffect, useState } from 'react';

type Commit = { sha: string; message: string; author: string; date: string; url: string };

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export function HistoryTab() {
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/landing/history')
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as {
          commits?: Commit[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (response.ok && data?.commits) setCommits(data.commits);
        else setError(data?.error ?? 'Gagal memuat riwayat');
      })
      .catch(() => !cancelled && setError('Gagal memuat riwayat'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red">{error}</p>;
  if (!commits) return <p className="text-sm text-neutral-500">Memuat riwayat…</p>;
  if (commits.length === 0) return <p className="text-sm text-neutral-500">Belum ada commit.</p>;

  return (
    <ul className="divide-y divide-neutral-200">
      {commits.map((commit) => (
        <li key={commit.sha} className="py-3">
          <a
            href={commit.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-foreground hover:text-brand"
          >
            {commit.message}
          </a>
          <p className="mt-0.5 text-xs text-neutral-500">
            {commit.author} · {dateFormat.format(new Date(commit.date))} · {commit.sha.slice(0, 7)}
          </p>
        </li>
      ))}
    </ul>
  );
}
