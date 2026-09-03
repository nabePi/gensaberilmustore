import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';
import { buildPosReceiptFilename, generatePosReceiptPdf } from '@/server/pos/receipt-pdf';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });

    if (!order || order.source !== 'POS') {
      return NextResponse.json({ error: 'Struk tidak ditemukan' }, { status: 404 });
    }

    const [storeSetting, cashier] = await Promise.all([
      prisma.storeSetting.findUnique({ where: { id: 1 } }),
      order.posCashierUserId
        ? prisma.user.findUnique({
            where: { id: order.posCashierUserId },
            select: { name: true, email: true },
          })
        : Promise.resolve(null),
    ]);

    const detail = serializeOrderDetail(order);
    const pdfBuffer = await generatePosReceiptPdf({
      detail,
      cashierName: cashier?.name ?? cashier?.email ?? '-',
      storeName: storeSetting?.name ?? 'GenSa Berilmu',
      storeAddress: storeSetting?.address ?? null,
      storePhone: storeSetting?.phone ?? null,
    });

    const filename = buildPosReceiptFilename(detail);
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
  { role: 'ADMIN' },
);
