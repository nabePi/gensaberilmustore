const LOGO_URL =
  'https://d33tu7komhhdsg.cloudfront.net/fL0bTwfYBTXRta-Ne8XDN_vScOqHAKlW4IHMcivnhbI/auto/0/250/no/1/bG9jYWw6Ly8vYnVzaW5lc3MvMjAyMS0xMi9neTZlZThjZWUwOTI0MGUyNmFhYWNlL2FsYnVtcy9wcm9maWxlL3BkZnRvanBnbWUtMS1jdXRvdXQucG5n.webp';

const SOCIAL_ICONS: { label: string; path: string }[] = [
  {
    label: 'X',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'Instagram',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.24 2.22.41.56.21.96.47 1.38.89.42.42.68.82.89 1.38.17.42.36 1.05.41 2.22.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.8-.41 2.22-.21.56-.47.96-.89 1.38-.42.42-.82.68-1.38.89-.42.17-1.05.36-2.22.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.24-2.22-.41a3.72 3.72 0 01-1.38-.89 3.72 3.72 0 01-.89-1.38c-.17-.42-.36-1.05-.41-2.22-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.24-1.8.41-2.22.21-.56.47-.96.89-1.38.42-.42.82-.68 1.38-.89.42-.17 1.05-.36 2.22-.41 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56a5.9 5.9 0 00-2.14 1.39A5.9 5.9 0 00.61 4.15c-.3.76-.5 1.63-.56 2.91C0 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.3.79.7 1.46 1.39 2.14.68.68 1.35 1.09 2.14 1.39.76.3 1.63.5 2.91.56C8.33 24 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56a5.9 5.9 0 002.14-1.39 5.9 5.9 0 001.39-2.14c.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91a5.9 5.9 0 00-1.39-2.14A5.9 5.9 0 0019.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0z',
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

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="container-prototype grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-1">
          <img src={LOGO_URL} alt="GenSa Berilmu" className="h-[42px] w-auto object-contain" />
          <p className="text-sm text-neutral-500">
            <strong className="text-foreground">GenSa Berilmu</strong> adalah toko online resmi dari
            PT. Generasi Shalahuddin Berilmu. Kami berkomitmen menyediakan berbagai produk edukasi,
            buku anak, dan kebutuhan keluarga berkualitas untuk mendukung tumbuh kembang generasi
            yang cerdas dan berkarakter.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">MENU</h4>
          <ul className="space-y-1.5 text-sm text-neutral-500">
            <li>
              <a href="#" className="hover:text-brand">
                Terms &amp; Conditions
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-brand">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-brand">
                Tentang Kami
              </a>
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

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">KONTAK KAMI</h4>
          <ul className="space-y-2 text-sm text-neutral-500">
            <li>
              <a href="https://wa.me/6281234567890" className="hover:text-brand">
                0812-3456-7890
              </a>
            </li>
            <li>
              <a href="mailto:info@gensaberilmu.co.id" className="hover:text-brand">
                info@gensaberilmu.co.id
              </a>
            </li>
            <li>Jl. Raya Bogor KM. 29, Cibinong, Bogor 16912, Indonesia</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">SOSIAL MEDIA</h4>
          <div className="flex gap-3">
            {SOCIAL_ICONS.map((icon) => (
              <a
                key={icon.label}
                href="#"
                aria-label={icon.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-brand hover:text-brand"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d={icon.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-200 py-4 text-center text-xs text-neutral-500">
        © 2025 PT. Generasi Shalahuddin Berilmu
      </div>
    </footer>
  );
}
