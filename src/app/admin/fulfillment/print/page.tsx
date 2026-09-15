import type { PaymentMethod } from '@prisma/client';
import { redirect } from 'next/navigation';

import { Code128Barcode } from '@/components/admin/Code128Barcode';
import { PrintTrigger } from '@/components/admin/PrintTrigger';
import { prisma } from '@/lib/db';
import { maskPhone } from '@/lib/format';
import { getAdminSessionUser } from '@/server/auth';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';

const LOGO_URL =
  'https://d33tu7komhhdsg.cloudfront.net/fL0bTwfYBTXRta-Ne8XDN_vScOqHAKlW4IHMcivnhbI/auto/0/250/no/1/bG9jYWw6Ly8vYnVzaW5lc3MvMjAyMS0xMi9neTZlZThjZWUwOTI0MGUyNmFhYWNlL2FsYnVtcy9wcm9maWxlL3BkZnRvanBnbWUtMS1jdXRvdXQucG5n.webp';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'transfer bank',
  EWALLET: 'e-wallet',
  QRIS: 'qris',
  POS_CASH: 'tunai',
  POS_TRANSFER: 'transfer',
  POS_QRIS: 'qris',
  POS_GATEWAY: 'payment gateway',
};

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
  const labels = idList
    .map((id) => orderedById.get(id))
    .filter((order): order is NonNullable<typeof order> => Boolean(order))
    .map(serializeOrderDetail);

  return (
    <div className="mx-auto bg-white p-[3mm] text-neutral-900">
      <style>{`
        @page { size: 100mm auto; margin: 3mm; }
        @media print {
          .no-print { display: none; }
          .label { page-break-after: always; }
          .label:last-child { page-break-after: auto; }
        }
      `}</style>

      <p className="no-print mb-4 text-right text-sm text-neutral-500">
        Gunakan Ctrl/Cmd+P untuk mencetak ulang
      </p>

      {labels.length === 0 ? (
        <p className="text-sm text-neutral-500">Tidak ada pesanan untuk dicetak.</p>
      ) : (
        labels.map((order) => (
          <div key={order.id} className="label w-[100mm] border border-neutral-400 p-[2.5mm]">
            <div className="mb-[2mm] flex items-start justify-between border-b border-neutral-400 pb-[2mm]">
              <img src={LOGO_URL} alt="GenSa Berilmu" className="h-[10mm] w-auto object-contain" />
              <img src="/jne.png" alt="JNE" className="h-[8mm] w-auto object-contain" />
            </div>

            <div className="mb-[2mm] grid grid-cols-2 gap-[2mm] border-b border-neutral-400 pb-[2mm] text-[8px] leading-tight">
              <div>
                <div className="mb-[1mm] flex items-center gap-[1mm]">
                  <svg viewBox="0 0 20 20" fill="black" className="h-[2.5mm] w-[2.5mm] shrink-0">
                    <path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-.734 1.649l-1.171.585a10.03 10.03 0 004.994 4.994l.585-1.17a1.5 1.5 0 011.65-.735l3.222.716A1.5 1.5 0 0116.5 15.5V16.5a1.5 1.5 0 01-1.5 1.5h-2C7.542 18 2 12.458 2 5.5v-2z" />
                  </svg>
                  <span>0813-8480-4494</span>
                </div>
                <div className="mb-[1mm] flex items-center gap-[1mm]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-[2.5mm] w-[2.5mm] shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>gensaberilmu.com</span>
                </div>
                <div className="flex items-center gap-[1mm]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-[2.5mm] w-[2.5mm] shrink-0"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.6" fill="black" stroke="none" />
                  </svg>
                  <span>@gensa.berilmu</span>
                </div>
              </div>
              <div className="flex items-start gap-[1mm]">
                <svg
                  viewBox="0 0 20 20"
                  fill="black"
                  className="mt-[0.3mm] h-[2.5mm] w-[2.5mm] shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-semibold">PT. Generasi Shalahuddin Berilmu</p>
                  <p>Jalan Margonda Raya Gang H. Fatimah</p>
                  <p>Bawah Rt 02/014 No. 8, Kemiri Muka, Beji,</p>
                  <p>Kota Depok, Jawa Barat 16423</p>
                </div>
              </div>
            </div>

            <div className="mb-[2mm] grid grid-cols-2 gap-[2mm]">
              <div className="border border-neutral-400 p-[1.5mm] text-[8px] leading-snug">
                <p className="mb-[1mm] font-semibold">Penerima : {order.receiver.name}</p>
                <p>{maskPhone(order.receiver.phone)}</p>
                <p>{order.receiver.address}</p>
                {order.receiver.city || order.receiver.district ? (
                  <p>{[order.receiver.city, order.receiver.district].filter(Boolean).join(', ')}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-center justify-center border border-neutral-400 p-[1.5mm] text-[8px]">
                <p className="mb-[1mm] font-semibold">Nomor Resi</p>
                {order.airwaybillNumber ? (
                  <>
                    <Code128Barcode value={order.airwaybillNumber} widthMm={40} heightMm={7} />
                    <p className="mt-[1mm] tracking-wide">{order.airwaybillNumber}</p>
                  </>
                ) : (
                  <p className="text-neutral-400">Belum tersedia</p>
                )}
              </div>
            </div>

            <div className="mb-[2mm] border border-neutral-400 p-[1.5mm] text-[8px]">
              <div className="flex flex-col items-center">
                <p className="mb-[1mm] font-semibold">Nomor Pesanan</p>
                <Code128Barcode value={order.orderNumber} widthMm={90} heightMm={7} />
                <p className="mt-[1mm] tracking-wide">{order.orderNumber}</p>
              </div>
              <div className="mt-[1.5mm] grid grid-cols-3 gap-[2mm] border-t border-neutral-200 pt-[1.5mm] leading-snug">
                <p>Berat : {order.weightKg}kg</p>
                <p>Pembayaran : {PAYMENT_METHOD_LABELS[order.payment.method]}</p>
                <p>Layanan : {order.shippingService}</p>
              </div>
            </div>

            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr className="border-y border-neutral-400 text-left">
                  <th className="w-[8%] py-[1mm]">#</th>
                  <th className="py-[1mm]">Produk</th>
                  <th className="w-[16%] py-[1mm] text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-neutral-200">
                    <td className="py-[1mm] align-top">{index + 1}</td>
                    <td className="py-[1mm] align-top">{item.title}</td>
                    <td className="py-[1mm] text-right align-top">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <PrintTrigger />
    </div>
  );
}
