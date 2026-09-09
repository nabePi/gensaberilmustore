import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ClaimPaymentButton } from '@/components/store/ClaimPaymentButton';
import { env } from '@/env';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid } from '@/lib/styles';
import { getSessionUser } from '@/server/auth';
import { applyMidtransTransactionStatus } from '@/server/payment/apply-status';
import { totalWithManualPaymentCode } from '@/server/payment/manual-qris';
import { getStatus } from '@/server/payment/midtrans';

async function getVisibleOrder(orderId: string) {
  let order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return null;

  if (order.userId !== null) {
    const user = await getSessionUser();
    if (!user || user.id !== order.userId) return null;
  }

  if (env.midtransSnapEnabled && order.status === 'AWAITING_PAYMENT') {
    const midtransStatus = await getStatus(order.orderNumber).catch(() => null);
    if (midtransStatus) {
      const pendingOrder = order;
      await prisma.$transaction(async (tx) => {
        await applyMidtransTransactionStatus(tx, pendingOrder, midtransStatus);
      });
      order =
        (await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } })) ??
        order;
    }
  }

  return order;
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  if (!orderId) {
    notFound();
  }

  const order = await getVisibleOrder(orderId);

  if (!order) {
    notFound();
  }

  if (order.status === 'AWAITING_PAYMENT') {
    if (order.paymentMethod === 'QRIS' && order.manualPaymentCode !== null) {
      const amountDue = totalWithManualPaymentCode(order.total, order.manualPaymentCode);

      return (
        <div className="container-prototype flex flex-col items-center gap-4 pt-6 pb-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Selesaikan Pembayaran</h1>
          {order.paymentClaimedAt === null ? (
            <>
              <p className="max-w-md text-sm text-neutral-500">
                Scan QRIS di bawah ini dan transfer <strong>tepat sejumlah</strong> nominal yang
                tertera (termasuk 3 digit kode unik) agar pesanan Anda dapat kami verifikasi.
              </p>
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/qris.jpeg" alt="QRIS Berilmu Bookstore" className="w-72 max-w-full" />
              </div>
            </>
          ) : null}
          <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-6 py-4 text-sm">
            <p>
              <strong>No. Pesanan:</strong> {order.orderNumber}
            </p>
            <p>
              <strong>Kode Unik:</strong> {order.manualPaymentCode.toString().padStart(3, '0')}
            </p>
          </div>
          <div className="w-full max-w-sm rounded-lg border-2 border-brand bg-brand-50 px-6 py-5">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              Total + Kode Unik
            </p>
            <p className="text-3xl font-extrabold text-brand">{formatCurrency(amountDue)}</p>
            <p className="text-xs text-neutral-500">
              ({formatCurrency(order.total)} + kode unik{' '}
              {order.manualPaymentCode.toString().padStart(3, '0')})
            </p>
          </div>
          <p className="max-w-md text-xs text-neutral-500">
            Kode unik ini menjadi milik GenSa Berilmu dan tidak dapat dikembalikan/direfund.
          </p>
          <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-xs text-neutral-500">
            Status pesanan masih <strong>&quot;Menunggu Pembayaran&quot;</strong> karena setiap
            transfer diperiksa manual oleh admin kami (maksimal 1x24 jam), belum otomatis. Sudah
            transfer? Tekan tombol di bawah ini agar admin segera memeriksa pembayaran Anda.
          </div>
          <ClaimPaymentButton
            orderId={order.id}
            initialClaimedAt={order.paymentClaimedAt?.toISOString() ?? null}
          />
          <div className="flex gap-3">
            <Link href="/" className={btnSolid}>
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="container-prototype flex flex-col items-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-8 w-8"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Menunggu Pembayaran</h1>
        <p className="max-w-md text-sm text-neutral-500">
          Pesanan Anda telah dibuat dan sedang menunggu konfirmasi pembayaran.
        </p>
        <div className="rounded-lg border border-neutral-200 bg-white px-6 py-4 text-sm">
          <p>
            <strong>No. Pesanan:</strong> {order.orderNumber}
          </p>
          <p>
            <strong>Total Pembayaran:</strong> {formatCurrency(order.total)}
          </p>
        </div>
        {order.manualPaymentCode !== null ? (
          <>
            <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-xs text-neutral-500">
              Status pesanan masih <strong>&quot;Menunggu Pembayaran&quot;</strong> karena setiap
              transfer diperiksa manual oleh admin kami (maksimal 1x24 jam), belum otomatis. Sudah
              transfer? Tekan tombol di bawah ini agar admin segera memeriksa pembayaran Anda.
            </div>
            <ClaimPaymentButton
              orderId={order.id}
              initialClaimedAt={order.paymentClaimedAt?.toISOString() ?? null}
            />
          </>
        ) : null}
        <div className="flex gap-3">
          <Link href="/" className={btnSolid}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  if (order.status === 'CANCELLED') {
    return (
      <div className="container-prototype flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">Pesanan Dibatalkan</h1>
        <p className="max-w-md text-sm text-neutral-500">
          Pesanan {order.orderNumber} telah dibatalkan.
        </p>
        <Link href="/" className={btnSolid}>
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="container-prototype flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green/10 text-green">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-8 w-8"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Pembayaran Berhasil!</h1>
      <p className="max-w-md text-sm text-neutral-500">
        Terima kasih telah berbelanja di GenSa Berilmu. Pesanan Anda sedang diproses dan akan segera
        dikirim.
      </p>
      <div className="rounded-lg border border-neutral-200 bg-white px-6 py-4 text-sm">
        <p>
          <strong>No. Pesanan:</strong> {order.orderNumber}
        </p>
        <p>
          <strong>Total Pembayaran:</strong> {formatCurrency(order.total)}
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className={btnSolid}>
          Kembali ke Beranda
        </Link>
        <Link href="/member/dashboard" className={btnOutline}>
          Lihat Pesanan Saya
        </Link>
      </div>
    </div>
  );
}
