import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { deleteProductImageFile } from '@/server/uploads/storage';

export const DELETE = withAuth<{ params: Promise<{ id: string; imageId: string }> }>(
  async (_request: NextRequest, { params }) => {
    const { id: productId, imageId } = await params;

    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      return NextResponse.json({ error: 'Gambar tidak ditemukan' }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id: imageId } });
    await deleteProductImageFile(image.url);

    if (image.isPrimary) {
      const nextPrimary = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { position: 'asc' },
      });

      if (nextPrimary) {
        await prisma.productImage.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
      }
    }

    return new NextResponse(null, { status: 204 });
  },
  { role: 'ADMIN' },
);
