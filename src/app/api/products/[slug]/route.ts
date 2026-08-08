import { NextRequest, NextResponse } from 'next/server';

import { getProductDetail } from '@/server/products/detail';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await getProductDetail(slug);

  if (!product) {
    return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json(product);
}
