'use client';

import type { ReactNode } from 'react';

const CONTACT_VCARD = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Berilmu;GenSa;;;',
  'FN:GenSa Berilmu',
  'ORG:GenSa Berilmu',
  'TEL;TYPE=WORK,VOICE:+6281384804494',
  'EMAIL:info@gensaberilmu.com',
  'END:VCARD',
].join('\n');

const LINKS: { href: string; label: string; primary?: boolean; icon: ReactNode }[] = [
  {
    href: '/',
    label: 'Beranda',
    icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  },
  {
    href: '/products',
    label: 'Toko Online',
    icon: <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />,
  },
  {
    href: '/products',
    label: 'Order Cepat Via Website',
    primary: true,
    icon: (
      <path d="M6.331 8H17.67a2 2 0 012 2.304l-1.255 8.152A3 3 0 0115.426 21H8.574a3 3 0 01-2.965-2.544l-1.255-8.152A2 2 0 016.331 8M9 11V6a3 3 0 016 0v5" />
    ),
  },
  {
    href: 'https://wa.me/6281384804494',
    label: 'Pemesanan Via WhatsApp',
    icon: <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5H4l1.6-4A8.5 8.5 0 1121 11.5z" />,
  },
  {
    href: '#',
    label: 'Mau Jadi Reseller Dropship?',
    icon: <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />,
  },
  {
    href: '#',
    label: 'Undang Ustadz Edgar Hamas',
    icon: <path d="M12 2l2.4 6.5L21 11l-6.6 2.5L12 20l-2.4-6.5L3 11l6.6-2.5z" />,
  },
  {
    href: '#',
    label: 'Mau Jadi Marketing Affiliate Produk Gensa?',
    icon: (
      <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-1.13a4 4 0 100-8 4 4 0 000 8z" />
    ),
  },
  {
    href: '#',
    label: 'Official Instagram',
    icon: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </>
    ),
  },
  {
    href: '#',
    label: 'Official YouTube',
    icon: <path d="M2 8a3 3 0 013-3h14a3 3 0 013 3v8a3 3 0 01-3 3H5a3 3 0 01-3-3zM10 9l5 3-5 3z" />,
  },
];

function handleSaveContact() {
  const blob = new Blob([CONTACT_VCARD], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gensa-berilmu.vcf';
  anchor.click();
  URL.revokeObjectURL(url);
}

async function handleShareContact() {
  const shareData = {
    title: 'GenSa Berilmu',
    text: 'Official Website Penerbit GenSa Berilmu',
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  if (navigator.share) {
    await navigator.share(shareData).catch(() => {});
    return;
  }

  if (shareData.url) {
    await navigator.clipboard.writeText(shareData.url).catch(() => {});
  }
}

export default function LinktreePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand">
            GB
          </div>
          <h1 className="mt-3 text-xl font-bold text-foreground">GenSa Berilmu</h1>
          <p className="mt-1 text-sm text-neutral-500">Official Website Penerbit GenSa Berilmu</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSaveContact}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-medium px-4 py-2 bg-white text-brand border border-brand hover:bg-brand-50 transition-colors"
          >
            Simpan Kontak
          </button>
          <button
            type="button"
            onClick={handleShareContact}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-medium px-4 py-2 bg-white text-brand border border-brand hover:bg-brand-50 transition-colors"
          >
            Bagikan Kontak
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                link.primary
                  ? 'border-brand bg-brand text-white hover:bg-[#c95d00]'
                  : 'border-neutral-200 text-foreground hover:border-brand hover:text-brand'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0"
              >
                {link.icon}
              </svg>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
