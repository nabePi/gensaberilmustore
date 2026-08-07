import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import {
  extensionForMime,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  sniffImageMime,
} from '@/server/uploads/image';
import { saveProductImage } from '@/server/uploads/storage';

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, { params }) => {
    const { id: productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('image');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { image: ['File gambar wajib diunggah'] } },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { image: ['Ukuran file maksimal 5MB'] } },
        { status: 400 },
      );
    }

    const existingImageCount = await prisma.productImage.count({ where: { productId } });
    if (existingImageCount >= MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_IMAGES_PER_PRODUCT} gambar per produk` },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffImageMime(bytes);
    const extension = mime ? extensionForMime(mime) : null;

    if (!extension) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { image: ['Tipe file harus JPEG, PNG, atau WEBP'] } },
        { status: 400 },
      );
    }

    const url = await saveProductImage(productId, bytes, extension);

    const isPrimary = existingImageCount === 0 || formData?.get('isPrimary') === 'true';
    const altText = formData?.get('altText');

    const image = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
      }

      return tx.productImage.create({
        data: {
          productId,
          url,
          altText: typeof altText === 'string' && altText.length > 0 ? altText : null,
          position: existingImageCount,
          isPrimary,
        },
      });
    });

    return NextResponse.json(image, { status: 201 });
  },
  { role: 'ADMIN' },
);
