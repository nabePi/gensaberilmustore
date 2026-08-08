import Link from 'next/link';

import { btnSolid } from '@/lib/styles';

export default function ProductNotFound() {
  return (
    <div className="container-prototype flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-foreground">Produk Tidak Ditemukan</h1>
      <p className="text-sm text-neutral-500">
        Produk yang Anda cari mungkin sudah tidak tersedia atau telah dihapus.
      </p>
      <Link href="/products" className={btnSolid}>
        Lihat Semua Produk
      </Link>
    </div>
  );
}
