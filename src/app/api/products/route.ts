import { NextRequest, NextResponse } from 'next/server';

import { listProducts } from '@/server/products/list';
import { listProductsQuerySchema } from '@/server/products/schema';

export async function GET(request: NextRequest) {
  const parsed = listProductsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await listProducts(parsed.data);

  return NextResponse.json(result);
}
