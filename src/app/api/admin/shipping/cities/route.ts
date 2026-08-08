import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { createCitySchema } from '@/server/shipping/schema';

export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createCitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const city = await prisma.city.create({ data: parsed.data });

    return NextResponse.json(city, { status: 201 });
  },
  { role: 'ADMIN' },
);
