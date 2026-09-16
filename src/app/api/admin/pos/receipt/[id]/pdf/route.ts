import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { STORE_ADDRESS, STORE_LEGAL_NAME, STORE_PHONE } from '@/lib/site';
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

    const cashier = order.posCashierUserId
      ? await prisma.user.findUnique({
          where: { id: order.posCashierUserId },
          select: { name: true, email: true },
        })
      : null;

    const detail = serializeOrderDetail(order);
    const pdfBuffer = await generatePosReceiptPdf({
      detail,
      cashierName: cashier?.name ?? cashier?.email ?? '-',
      storeName: STORE_LEGAL_NAME,
      storeAddress: STORE_ADDRESS,
      storePhone: STORE_PHONE,
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
