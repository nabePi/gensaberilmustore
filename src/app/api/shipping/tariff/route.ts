import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { computeCartWeightKg, resolveCart } from '@/server/cart/cart';
import {
  fetchJneTariffOptions,
  isAllowedJneService,
  JneTariffError,
} from '@/server/shipping/jne-tariff';
import { tariffQuerySchema } from '@/server/shipping/schema';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = tariffQuerySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const destination = await prisma.destination.findUnique({
    where: { id: parsed.data.destinationId },
    select: { tariffCode: true },
  });

  if (!destination) {
    return NextResponse.json({ error: 'Tujuan tidak valid' }, { status: 400 });
  }

  const { cart } = await resolveCart(request);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: 'Keranjang Anda kosong' }, { status: 400 });
  }

  const weightKg = computeCartWeightKg(cart);

  try {
    const options = await fetchJneTariffOptions(destination.tariffCode, weightKg);
    return NextResponse.json({
      options: options
        .filter((option) => isAllowedJneService(option.serviceDisplay))
        .map((option) => ({
          service: option.serviceDisplay,
          shippingCost: option.price,
          etd: `${option.etdFrom}-${option.etdThru} hari`,
        })),
    });
  } catch (error) {
    if (error instanceof JneTariffError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
