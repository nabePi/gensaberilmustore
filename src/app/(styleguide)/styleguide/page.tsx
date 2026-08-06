import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Styleguide — Gensa Berilmu Store",
  robots: { index: false },
};

const brandScale = [
  { shade: 50, className: "bg-brand-50" },
  { shade: 100, className: "bg-brand-100" },
  { shade: 200, className: "bg-brand-200" },
  { shade: 300, className: "bg-brand-300" },
  { shade: 400, className: "bg-brand-400" },
  { shade: 500, className: "bg-brand" },
  { shade: 600, className: "bg-brand-600" },
  { shade: 700, className: "bg-brand-700" },
  { shade: 800, className: "bg-brand-800" },
  { shade: 900, className: "bg-brand-900" },
];

const neutralScale = [
  { shade: 50, className: "bg-neutral-50" },
  { shade: 100, className: "bg-neutral-100" },
  { shade: 200, className: "bg-neutral-200" },
  { shade: 300, className: "bg-neutral-300" },
  { shade: 400, className: "bg-neutral-400" },
  { shade: 500, className: "bg-neutral-500" },
  { shade: 600, className: "bg-neutral-600" },
  { shade: 700, className: "bg-neutral-700" },
  { shade: 800, className: "bg-neutral-800" },
  { shade: 900, className: "bg-neutral-900" },
  { shade: 950, className: "bg-neutral-950" },
];
const typeScale = [
  { label: "2xs", size: "10px", className: "text-2xs" },
  { label: "xs", size: "12px", className: "text-xs" },
  { label: "sm", size: "14px", className: "text-sm" },
  { label: "base", size: "16px", className: "text-base" },
  { label: "lg", size: "18px", className: "text-lg" },
  { label: "xl", size: "20px", className: "text-xl" },
  { label: "2xl", size: "24px", className: "text-2xl" },
  { label: "3xl", size: "28px", className: "text-3xl" },
  { label: "4xl", size: "30px", className: "text-4xl" },
  { label: "5xl", size: "32px", className: "text-5xl" },
  { label: "6xl", size: "42px", className: "text-6xl" },
];

export default function StyleguidePage() {
  return (
    <main className="min-h-screen py-10">
      <div className="container-prototype space-y-12">
        <div>
          <h1 className="text-4xl font-bold text-brand">Design System Styleguide</h1>
          <p className="mt-2 text-neutral-500">
            Sumber kebenaran token visual yang diekstrak dari prototype
            GenSa Berilmu.
          </p>
        </div>

        {/* Colors — Brand */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Brand</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Warna aksen utama #95271B (oranye kemerahan).
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
            {brandScale.map((item) => (
              <div key={item.shade} className="space-y-1">
                <div
                  className={`h-16 rounded-lg ${item.className}`}
                  aria-label={item.className}
                />
                <div className="text-xs font-semibold text-foreground">
                  {item.className.replace("bg-", "")}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Colors — Neutral */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Neutral</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Skala abu-abu untuk teks, border, dan permukaan.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-3">
            {neutralScale.map((item) => (
              <div key={item.shade} className="space-y-1">
                <div
                  className={`h-16 rounded-lg border border-neutral-200 ${item.className}`}
                  aria-label={item.className}
                />
                <div className="text-xs font-semibold text-foreground">
                  {item.className.replace("bg-", "")}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Colors — Accents */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Accents</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="space-y-1">
              <div className="h-16 w-24 rounded-lg bg-navy" />
              <div className="text-xs font-semibold">navy</div>
            </div>
            <div className="space-y-1">
              <div className="h-16 w-24 rounded-lg bg-red" />
              <div className="text-xs font-semibold">red</div>
            </div>
            <div className="space-y-1">
              <div className="h-16 w-24 rounded-lg bg-green" />
              <div className="text-xs font-semibold">green</div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Typography</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Font family: Source Sans 3 (400, 500, 600, 700).
          </p>
          <div className="mt-4 divide-y divide-neutral-200">
            {typeScale.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between py-3"
              >
                <span className={item.className}>
                  {item.className} ({item.size})
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  .{item.className}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-6">
            <span className="font-normal">Normal 400</span>
            <span className="font-medium">Medium 500</span>
            <span className="font-semibold">Semibold 600</span>
            <span className="font-bold">Bold 700</span>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Buttons</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-semibold px-4 py-2 bg-brand text-white border border-brand hover:bg-[#c95d00] hover:border-[#c95d00] transition-colors"
            >
              Solid Button
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-medium px-4 py-2 bg-white text-brand border border-brand hover:bg-brand-50 transition-colors"
            >
              Outline Button
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-semibold px-4 py-2 bg-neutral-100 text-foreground border border-neutral-200 hover:bg-neutral-200 transition-colors"
              disabled
            >
              Disabled Button
            </button>
          </div>
        </section>

        {/* Form inputs */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Form Inputs</h2>
          <div className="mt-4 grid gap-4 max-w-md">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                type="email"
                placeholder="nama@email.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-200 rounded-sm outline-none focus:border-brand transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">
                Kategori
              </label>
              <select className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-200 rounded-sm outline-none focus:border-brand transition-colors">
                <option>Pilih kategori</option>
                <option>Buku Anak</option>
                <option>Keislaman</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">
                Catatan
              </label>
              <textarea
                rows={3}
                placeholder="Tulis catatan..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-200 rounded-sm outline-none focus:border-brand transition-colors resize-y"
              />
            </div>
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Badges</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand text-white">
              Brand
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red">
              Diskon 20%
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">
              Neutral
            </span>
          </div>
        </section>

        {/* Card */}
        <section>
          <h2 className="text-2xl font-bold text-foreground">Card</h2>
          <div className="mt-4 max-w-sm bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-md">
            <div className="h-32 bg-neutral-100" />
            <div className="p-4 space-y-2">
              <h3 className="text-base font-bold text-foreground">
                Contoh Card Produk
              </h3>
              <p className="text-sm text-neutral-500">
                Card menggunakan border radius lg (14px), shadow md, dan
                padding 16px.
              </p>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-semibold px-4 py-2 bg-brand text-white border border-brand hover:bg-[#c95d00] hover:border-[#c95d00] transition-colors"
              >
                Lihat Detail
              </button>
            </div>
          </div>
        </section>

        <footer className="pt-8 text-sm text-neutral-500">
          <p>
            Halaman ini ditandai noindex dan akan dihapus setelah delivery.
          </p>
        </footer>
      </div>
    </main>
  );
}
