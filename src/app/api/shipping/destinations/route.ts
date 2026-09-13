import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  listCities,
  listDistricts,
  listProvinces,
  listSubdistricts,
} from '@/server/shipping/destinations';
import { listDestinationsQuerySchema } from '@/server/shipping/schema';

export async function GET(request: NextRequest) {
  const parsed = listDestinationsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { level, province, city, district, q } = parsed.data;

  if (level === 'province') {
    const items = await listProvinces(q);
    return NextResponse.json({ items });
  }

  if (level === 'city') {
    const items = await listCities(province!, q);
    return NextResponse.json({ items });
  }

  if (level === 'district') {
    const items = await listDistricts(province!, city!, q);
    return NextResponse.json({ items });
  }

  const items = await listSubdistricts(province!, city!, district!, q);
  return NextResponse.json({ items });
}
