import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/server/auth';
import { extensionForMime, MAX_IMAGE_SIZE_BYTES, sniffImageMime } from '@/server/uploads/image';
import { saveGenericImage } from '@/server/uploads/storage';

export const POST = withAuth(
  async (request: NextRequest) => {
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

    const url = await saveGenericImage(bytes, extension);

    return NextResponse.json({ url }, { status: 201 });
  },
  { role: 'ADMIN' },
);
