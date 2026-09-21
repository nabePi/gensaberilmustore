import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';
import { extensionForMime, MAX_IMAGE_SIZE_BYTES, sniffImageMime } from '@/server/uploads/image';
import { isR2Enabled } from '@/server/uploads/r2';
import { deletePaymentProofImageFile, savePaymentProofImage } from '@/server/uploads/storage';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  if (order.userId !== null) {
    const user = await getSession(request);
    if (!user || user.id !== order.userId) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }
  }

  if (order.status !== 'AWAITING_PAYMENT' || order.manualPaymentCode === null) {
    return NextResponse.json(
      { error: 'Bukti pembayaran tidak dapat diunggah untuk pesanan ini' },
      { status: 400 },
    );
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

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  const extension = mime ? extensionForMime(mime) : null;

  if (!extension) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: { image: ['Tipe file harus JPEG, PNG, atau WEBP'] } },
      { status: 400 },
    );
  }

  try {
    const url = await savePaymentProofImage(order.id, bytes, extension);
    const previousProofUrl = order.paymentProofUrl;

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProofUrl: url,
        paymentProofUploadedAt: new Date(),
        paymentClaimedAt: order.paymentClaimedAt ?? new Date(),
      },
    });

    if (previousProofUrl) {
      await deletePaymentProofImageFile(previousProofUrl);
    }

    return NextResponse.json({
      paymentProofUrl: updated.paymentProofUrl,
      paymentProofUploadedAt: updated.paymentProofUploadedAt,
      paymentClaimedAt: updated.paymentClaimedAt,
    });
  } catch (error) {
    console.error('Payment proof upload failed', error);
    const hint = isR2Enabled()
      ? 'Gagal mengunggah ke R2. Periksa kredensial R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY dan izin bucket.'
      : 'Gagal menyimpan gambar ke storage lokal.';
    return NextResponse.json({ error: hint }, { status: 502 });
  }
}
