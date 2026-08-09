import { redirect } from 'next/navigation';

import { PrintTrigger } from '@/components/admin/PrintTrigger';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { getAdminSessionUser } from '@/server/auth';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function FulfillmentPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const user = await getAdminSessionUser();
  if (!user || user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const { ids } = await searchParams;
  const idList = (ids ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const orders =
    idList.length > 0
      ? await prisma.order.findMany({
          where: { id: { in: idList } },
          include: orderDetailInclude,
        })
      : [];

  const orderedById = new Map(orders.map((order) => [order.id, order]));
  const packingSlips = idList
    .map((id) => orderedById.get(id))
    .filter((order): order is NonNullable<typeof order> => Boolean(order))
    .map(serializeOrderDetail);

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-neutral-900">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none; }
          .packing-slip { page-break-after: always; }
          .packing-slip:last-child { page-break-after: auto; }
        }
      `}</style>

      <p className="no-print mb-4 text-right text-sm text-neutral-500">
        Gunakan Ctrl/Cmd+P untuk mencetak ulang
      </p>

      {packingSlips.length === 0 ? (
        <p className="text-sm text-neutral-500">Tidak ada pesanan untuk dicetak.</p>
      ) : (
        packingSlips.map((order) => (
          <div key={order.id} className="packing-slip border border-neutral-300 p-6">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-300 pb-4">
              <div>
                <h1 className="text-lg font-bold">GenSa Berilmu</h1>
                <p className="text-xs text-neutral-500">PT. Generasi Shalahuddin Berilmu</p>
              </div>
              <div className="text-right">
                <h2 className="text-base font-bold">Packing List</h2>
                <p className="text-xs text-neutral-500">
                  {order.orderNumber} · {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1 font-semibold">Penerima</p>
                <p>{order.receiver.name}</p>
                <p>{order.receiver.phone}</p>
                <p>{order.receiver.address}</p>
                {order.receiver.city ? <p>{order.receiver.city}</p> : null}
              </div>
              <div className="text-right">
                <p className="mb-1 font-semibold">Status</p>
                <p>{ORDER_STATUS_LABELS[order.status]}</p>
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left">
                  <th className="py-2">Produk</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Harga</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-100">
                    <td className="py-2">{item.title}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.priceSnapshot)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex justify-end text-sm font-bold">
              <span>Total: {formatCurrency(order.pricing.total)}</span>
            </div>

            {order.receiver.note ? (
              <p className="mt-3 text-xs text-neutral-500">Catatan: {order.receiver.note}</p>
            ) : null}
          </div>
        ))
      )}

      <PrintTrigger />
    </div>
  );
}
