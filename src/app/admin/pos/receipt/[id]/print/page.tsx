import { notFound, redirect } from 'next/navigation';

import { PrintTrigger } from '@/components/admin/PrintTrigger';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { getAdminSessionUser } from '@/server/auth';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  POS_CASH: 'Tunai',
  POS_QRIS: 'QRIS',
  POS_TRANSFER: 'Transfer',
  POS_GATEWAY: 'Payment Gateway',
};

export default async function PosReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminSessionUser();
  if (!user || user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });

  if (!order || order.source !== 'POS') {
    notFound();
  }

  await prisma.order.update({ where: { id }, data: { posReceiptPrintedAt: new Date() } });

  const storeSetting = await prisma.storeSetting.findUnique({ where: { id: 1 } });
  const detail = serializeOrderDetail(order);

  return (
    <div className="mx-auto max-w-xs bg-white p-4 text-neutral-900">
      <style>{`
        @page { size: 80mm auto; margin: 4mm; }
        @media print { .no-print { display: none; } }
      `}</style>

      <p className="no-print mb-4 text-center text-xs text-neutral-500">
        Gunakan Ctrl/Cmd+P untuk mencetak ulang
      </p>

      <div className="border-b border-dashed border-neutral-400 pb-2 text-center">
        <p className="text-sm font-bold">{storeSetting?.name ?? 'GenSa Berilmu'}</p>
        {storeSetting?.address ? (
          <p className="text-[10px] text-neutral-500">{storeSetting.address}</p>
        ) : null}
        {storeSetting?.phone ? (
          <p className="text-[10px] text-neutral-500">{storeSetting.phone}</p>
        ) : null}
      </div>

      <div className="border-b border-dashed border-neutral-400 py-2 text-[11px]">
        <div className="flex justify-between">
          <span>No. Transaksi</span>
          <span>{detail.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Tanggal</span>
          <span>{new Date(detail.createdAt).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir</span>
          <span>{user.name ?? user.email}</span>
        </div>
        <div className="flex justify-between">
          <span>Pembayaran</span>
          <span>{PAYMENT_METHOD_LABELS[detail.payment.method] ?? detail.payment.method}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-neutral-400 py-2 text-[11px]">
        {detail.items.map((item) => (
          <div key={item.id} className="mb-1">
            <p>{item.title}</p>
            <div className="flex justify-between text-neutral-600">
              <span>
                {item.quantity} x {formatCurrency(item.priceSnapshot)}
              </span>
              <span>{formatCurrency(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="py-2 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(detail.pricing.subtotal)}</span>
        </div>
        {detail.pricing.discount > 0 ? (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatCurrency(detail.pricing.discount)}</span>
          </div>
        ) : null}
        <div className="mt-1 flex justify-between text-sm font-bold">
          <span>Total</span>
          <span>{formatCurrency(detail.pricing.total)}</span>
        </div>
      </div>

      <p className="pt-2 text-center text-[10px] text-neutral-500">
        Terima kasih atas kunjungan Anda
      </p>

      <PrintTrigger />
    </div>
  );
}
