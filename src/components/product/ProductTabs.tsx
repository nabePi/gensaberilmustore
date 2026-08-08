'use client';

import { useState } from 'react';

type Tab = { key: string; label: string };

const TABS: Tab[] = [
  { key: 'deskripsi', label: 'Deskripsi' },
  { key: 'daftar-isi', label: 'Daftar Isi' },
  { key: 'keunggulan', label: 'Keunggulan' },
  { key: 'ulasan', label: 'Ulasan' },
];

function toLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function ProductTabs({
  description,
  tocText,
  highlightsText,
}: {
  description: string;
  tocText: string | null;
  highlightsText: string | null;
}) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]!.key);
  const tocLines = toLines(tocText);
  const highlightLines = toLines(highlightsText);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap rounded-sm px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand text-white'
                : 'bg-white text-foreground hover:bg-brand-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-32 rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
        {activeTab === 'deskripsi' ? (
          <div className="whitespace-pre-line">{description}</div>
        ) : null}

        {activeTab === 'daftar-isi' ? (
          tocLines.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {tocLines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          ) : (
            <p>Daftar isi belum tersedia untuk produk ini.</p>
          )
        ) : null}

        {activeTab === 'keunggulan' ? (
          highlightLines.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {highlightLines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          ) : (
            <p>Keunggulan produk belum tersedia.</p>
          )
        ) : null}

        {activeTab === 'ulasan' ? (
          <p>
            Belum ada ulasan untuk produk ini. Jadilah yang pertama memberikan ulasan setelah
            membeli produk ini.
          </p>
        ) : null}
      </div>
    </div>
  );
}
