import Link from 'next/link';

const LOGO_URL =
  'https://d33tu7komhhdsg.cloudfront.net/fL0bTwfYBTXRta-Ne8XDN_vScOqHAKlW4IHMcivnhbI/auto/0/250/no/1/bG9jYWw6Ly8vYnVzaW5lc3MvMjAyMS0xMi9neTZlZThjZWUwOTI0MGUyNmFhYWNlL2FsYnVtcy9wcm9maWxlL3BkZnRvanBnbWUtMS1jdXRvdXQucG5n.webp';

const SOCIAL_ICONS: { label: string; path: string | null }[] = [
  {
    label: 'X',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'Instagram',
    path: null,
  },
  {
    label: 'Facebook',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    label: 'YouTube',
    path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
];

const SOCIAL_HOVER: Record<string, string> = {
  X: 'hover:border-black hover:bg-black hover:text-white',
  Instagram:
    'hover:border-[#dc2743] hover:bg-gradient-to-br hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white',
  Facebook: 'hover:border-[#1877f2] hover:bg-[#1877f2] hover:text-white',
  YouTube: 'hover:border-[#ff0000] hover:bg-[#ff0000] hover:text-white',
};

export function SiteFooter() {
  return (
    <footer className="mt-16 hidden bg-[#f4f5f7] lg:block">
      <div className="container-prototype grid grid-cols-1 gap-8 pt-12 pb-8 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1.2fr_0.9fr]">
        <div>
          <img src={LOGO_URL} alt="GenSa Berilmu" className="mb-4 h-[50px] w-auto object-contain" />
          <p className="max-w-[420px] text-sm leading-[1.7] text-neutral-500">
            <strong className="text-foreground">Gensa Berilmu ®️</strong> adalah penerbit yang fokus
            pada tadabbur sejarah Islam. Ditulis oleh penulis-penulis muda dengan gaya khas
            masing-masing, visi kami adalah membuat kisah sejarah Islam terasa ringan dan mudah
            dipahami oleh anak muda. Learn History, Repeat Victory — selamat menjelajah bersama
            Gensa Berilmu!
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-[13px] font-bold tracking-[0.04em] text-foreground">MENU</h4>
          <ul className="flex flex-col gap-3 text-sm text-neutral-500">
            <li>
              <a href="/terms" className="hover:text-brand">
                Terms &amp; Conditions
              </a>
            </li>
            <li>
              <a href="/privacy" className="hover:text-brand">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/about" className="hover:text-brand">
                Tentang Kami
              </a>
            </li>
            <li>
              <Link href="/blog" className="hover:text-brand">
                Blog
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-brand">
                Daftar Reseller
              </a>
            </li>
            <li>
              <a href="/member/dashboard" className="hover:text-brand">
                My Account
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-[13px] font-bold tracking-[0.04em] text-foreground">
            KONTAK KAMI
          </h4>
          <ul className="flex flex-col gap-3 text-sm text-neutral-500">
            <li className="flex items-center gap-2.5">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-brand">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
              </span>
              <a href="https://wa.me/6281384804494" className="hover:text-brand">
                0813-8480-4494
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-brand">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <a href="mailto:info@gensaberilmu.com" className="hover:text-brand">
                info@gensaberilmu.com
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center text-brand">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span>
                Jalan Margonda Raya Gang H. Fatimah Bawah Rt 02/014 No. 8, Kemiri Muka, Beji, Kota
                Depok, Jawa Barat 16423
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-[13px] font-bold tracking-[0.04em] text-foreground">
            SOSIAL MEDIA
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {SOCIAL_ICONS.map((icon) => (
              <a
                key={icon.label}
                href="#"
                aria-label={icon.label}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-all ${SOCIAL_HOVER[icon.label]}`}
              >
                {icon.path ? (
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
                    <path d={icon.path} />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-200 py-5 text-center text-[13px] text-neutral-500">
        © 2025 PT. Generasi Shalahuddin Berilmu
      </div>
    </footer>
  );
}
