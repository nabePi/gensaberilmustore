'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

declare global {
  interface Window {
    snap?: {
      pay: (
        snapToken: string,
        callbacks: {
          onSuccess: () => void;
          onPending: () => void;
          onError: () => void;
          onClose: () => void;
        },
      ) => void;
    };
  }
}

const SNAP_SCRIPT_URL = 'https://app.sandbox.midtrans.com/snap/snap.js';
const AFFILIATE_COOKIE_NAME = 'gsb_aff';

function readAffiliateCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${AFFILIATE_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
  { value: 'EWALLET', label: 'E-Wallet' },
  { value: 'QRIS', label: 'QRIS' },
] as const;

const VOUCHER_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Kode voucher tidak ditemukan.',
  INACTIVE: 'Voucher ini sudah tidak aktif.',
  NOT_STARTED: 'Voucher ini belum berlaku.',
  EXPIRED: 'Voucher ini sudah kedaluwarsa.',
  WRONG_CHANNEL: 'Voucher ini tidak berlaku untuk transaksi online.',
  MIN_PURCHASE_NOT_MET: 'Belanja Anda belum memenuhi minimum pembelian untuk voucher ini.',
  QUOTA_EXCEEDED: 'Kuota voucher ini sudah habis.',
  USER_LIMIT_REACHED: 'Anda sudah mencapai batas penggunaan voucher ini.',
};

type Cart = {
  items: { id: string; title: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  itemCount: number;
};

type City = { id: string; name: string; province: string; shippingCost: number };

type Receiver = {
  id: string;
  label: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  cityId: string;
  isDefault: boolean;
  city: { name: string; shippingCost: number };
};

type SessionUser = { id: string; email: string; name: string | null };

type VoucherResult =
  | { valid: true; voucherId: string; code: string; discountAmount: number }
  | { valid: false; reason: string };

const checkoutSchema = z
  .object({
    mode: z.enum(['receiver', 'manual']),
    receiverId: z.string().optional(),
    receiverName: z.string().optional(),
    receiverPhone: z.string().optional(),
    receiverEmail: z.string().optional(),
    receiverAddress: z.string().optional(),
    cityId: z.string().optional(),
    note: z.string().max(500).optional(),
    paymentMethod: z.enum(['BANK_TRANSFER', 'EWALLET', 'QRIS'], {
      required_error: 'Pilih metode pembayaran',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'receiver') {
      if (!data.receiverId) {
        ctx.addIssue({ code: 'custom', path: ['receiverId'], message: 'Pilih alamat penerima' });
      }
      return;
    }

    if (!data.receiverName) {
      ctx.addIssue({
        code: 'custom',
        path: ['receiverName'],
        message: 'Nama penerima wajib diisi',
      });
    }
    if (!data.receiverPhone) {
      ctx.addIssue({
        code: 'custom',
        path: ['receiverPhone'],
        message: 'Nomor telepon wajib diisi',
      });
    }
    if (!data.receiverEmail || !z.string().email().safeParse(data.receiverEmail).success) {
      ctx.addIssue({
        code: 'custom',
        path: ['receiverEmail'],
        message: 'Format email tidak valid',
      });
    }
    if (!data.receiverAddress) {
      ctx.addIssue({ code: 'custom', path: ['receiverAddress'], message: 'Alamat wajib diisi' });
    }
    if (!data.cityId) {
      ctx.addIssue({ code: 'custom', path: ['cityId'], message: 'Kota tujuan wajib dipilih' });
    }
  });

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherResult, setVoucherResult] = useState<VoucherResult | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const snapFailedRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { mode: 'manual', paymentMethod: 'BANK_TRANSFER' },
  });

  const mode = watch('mode');
  const selectedReceiverId = watch('receiverId');
  const selectedCityId = watch('cityId');

  useEffect(() => {
    async function bootstrap() {
      const [cartResponse, citiesResponse, sessionResponse] = await Promise.all([
        fetch('/api/cart'),
        fetch('/api/shipping/cities'),
        fetch('/api/auth/session'),
      ]);

      const cartData: Cart = await cartResponse.json();
      if (cartData.items.length === 0) {
        router.replace('/cart');
        return;
      }
      setCart(cartData);

      const citiesData: { items: City[] } = await citiesResponse.json();
      setCities(citiesData.items);

      const sessionData: { user: SessionUser | null } = await sessionResponse.json();
      setUser(sessionData.user);

      if (sessionData.user) {
        const receiversResponse = await fetch('/api/member/receivers');
        const receiversData: { items: Receiver[] } = await receiversResponse.json();
        setReceivers(receiversData.items);

        if (receiversData.items.length > 0) {
          const defaultReceiver =
            receiversData.items.find((receiver) => receiver.isDefault) ?? receiversData.items[0]!;
          setValue('mode', 'receiver');
          setValue('receiverId', defaultReceiver.id);
        }
      }

      setReady(true);
    }

    bootstrap();
  }, [router, setValue]);

  async function handleVoucherApply() {
    if (!voucherInput.trim() || !cart) return;
    setVoucherLoading(true);
    try {
      const response = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherInput.trim(),
          subtotal: cart.subtotal,
          channel: 'ONLINE',
        }),
      });
      const data: VoucherResult = await response.json();
      setVoucherResult(data);
    } finally {
      setVoucherLoading(false);
    }
  }

  function handleVoucherRemove() {
    setVoucherResult(null);
    setVoucherInput('');
  }

  const shippingCost = (() => {
    if (mode === 'receiver') {
      const receiver = receivers.find((item) => item.id === selectedReceiverId);
      return receiver?.city.shippingCost ?? 0;
    }
    const city = cities.find((item) => item.id === selectedCityId);
    return city?.shippingCost ?? 0;
  })();

  const discount = voucherResult && voucherResult.valid ? voucherResult.discountAmount : 0;
  const subtotal = cart?.subtotal ?? 0;
  const total = Math.max(0, subtotal + shippingCost - discount);

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null);
    setSubmitting(true);

    const affiliateCode = readAffiliateCookie();

    const payload =
      values.mode === 'receiver'
        ? {
            useReceiverId: values.receiverId,
            note: values.note,
            paymentMethod: values.paymentMethod,
            voucherCode: voucherResult && voucherResult.valid ? voucherResult.code : undefined,
            affiliateCode,
          }
        : {
            receiverName: values.receiverName,
            receiverPhone: values.receiverPhone,
            receiverEmail: values.receiverEmail,
            receiverAddress: values.receiverAddress,
            cityId: values.cityId,
            note: values.note,
            paymentMethod: values.paymentMethod,
            voucherCode: voucherResult && voucherResult.valid ? voucherResult.code : undefined,
            affiliateCode,
          };

    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        setSubmitError(orderData.error ?? 'Gagal membuat pesanan. Silakan coba lagi.');
        setSubmitting(false);
        return;
      }

      const { orderId } = orderData;
      const redirectToSuccess = () => router.push(`/payment/success?orderId=${orderId}`);

      const paymentResponse = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (!paymentResponse.ok) {
        redirectToSuccess();
        return;
      }

      const { snapToken, redirectUrl } = await paymentResponse.json();

      if (snapFailedRef.current || !window.snap) {
        window.location.href = redirectUrl;
        return;
      }

      window.snap.pay(snapToken, {
        onSuccess: redirectToSuccess,
        onPending: redirectToSuccess,
        onError: redirectToSuccess,
        onClose: redirectToSuccess,
      });
      setSubmitting(false);
    } catch {
      setSubmitError('Gagal membuat pesanan. Silakan coba lagi.');
      setSubmitting(false);
    }
  }

  if (!ready || !cart) {
    return (
      <div className="container-prototype py-16 text-center text-sm text-neutral-500">
        Memuat checkout...
      </div>
    );
  }

  return (
    <div className="container-prototype py-8">
      <Script
        src={SNAP_SCRIPT_URL}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onError={() => {
          snapFailedRef.current = true;
        }}
      />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Alamat Penerima</h2>
              {user && receivers.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setValue('mode', mode === 'receiver' ? 'manual' : 'receiver')}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  {mode === 'receiver' ? 'Gunakan alamat baru' : 'Gunakan alamat tersimpan'}
                </button>
              ) : null}
            </div>

            {mode === 'receiver' ? (
              <div className="flex flex-col gap-2">
                {receivers.map((receiver) => (
                  <label
                    key={receiver.id}
                    className="flex cursor-pointer items-start gap-3 rounded-sm border border-neutral-200 p-3 text-sm"
                  >
                    <input
                      type="radio"
                      value={receiver.id}
                      checked={selectedReceiverId === receiver.id}
                      onChange={() => setValue('receiverId', receiver.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-foreground">
                        {receiver.label} &middot; {receiver.name}
                      </span>
                      <span className="block text-neutral-500">{receiver.phone}</span>
                      <span className="block text-neutral-500">
                        {receiver.address}, {receiver.city.name}
                      </span>
                    </span>
                  </label>
                ))}
                {errors.receiverId ? (
                  <p className="text-xs text-red">{errors.receiverId.message}</p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600">Nama Penerima</label>
                  <input {...register('receiverName')} className={inputBase} />
                  {errors.receiverName ? (
                    <p className="text-xs text-red">{errors.receiverName.message}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600">Nomor Telepon</label>
                  <input {...register('receiverPhone')} className={inputBase} />
                  {errors.receiverPhone ? (
                    <p className="text-xs text-red">{errors.receiverPhone.message}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600">Email</label>
                  <input type="email" {...register('receiverEmail')} className={inputBase} />
                  {errors.receiverEmail ? (
                    <p className="text-xs text-red">{errors.receiverEmail.message}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600">Kota</label>
                  <select {...register('cityId')} className={inputBase} defaultValue="">
                    <option value="" disabled>
                      Pilih kota
                    </option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}, {city.province}
                      </option>
                    ))}
                  </select>
                  {errors.cityId ? (
                    <p className="text-xs text-red">{errors.cityId.message}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-neutral-600">Alamat Lengkap</label>
                  <textarea {...register('receiverAddress')} rows={3} className={inputBase} />
                  {errors.receiverAddress ? (
                    <p className="text-xs text-red">{errors.receiverAddress.message}</p>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Catatan (opsional)</label>
              <textarea {...register('note')} rows={2} className={inputBase} />
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 text-base font-bold text-foreground">Metode Pembayaran</h2>
            <div className="flex flex-col gap-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className="flex cursor-pointer items-center gap-3 rounded-sm border border-neutral-200 p-3 text-sm"
                >
                  <input type="radio" value={method.value} {...register('paymentMethod')} />
                  {method.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="h-fit rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-foreground">Ringkasan Pesanan</h2>

          <div className="mb-4 flex flex-col gap-1 text-sm">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between text-neutral-600">
                <span>
                  {item.title} x{item.quantity}
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={voucherInput}
                onChange={(event) => setVoucherInput(event.target.value.toUpperCase())}
                placeholder="Kode voucher"
                className={inputBase}
                disabled={Boolean(voucherResult?.valid)}
              />
              {voucherResult?.valid ? (
                <button type="button" onClick={handleVoucherRemove} className={btnOutline}>
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleVoucherApply}
                  disabled={voucherLoading || !voucherInput.trim()}
                  className={btnOutline}
                >
                  Terapkan
                </button>
              )}
            </div>
            {voucherResult && !voucherResult.valid ? (
              <p className="text-xs text-red">
                {VOUCHER_ERROR_MESSAGES[voucherResult.reason] ?? 'Kode voucher tidak valid.'}
              </p>
            ) : null}
            {voucherResult?.valid ? (
              <p className="text-xs text-green">
                Voucher {voucherResult.code} berhasil diterapkan.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Ongkos Kirim</span>
              <span>{formatCurrency(shippingCost)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-green">
                <span>Diskon Voucher</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold text-foreground">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {submitError ? <p className="mt-4 text-xs text-red">{submitError}</p> : null}

          <button type="submit" disabled={submitting} className={`${btnSolid} mt-5 w-full`}>
            {submitting ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
          <Link href="/cart" className={`${btnOutline} mt-2 w-full`}>
            Kembali ke Keranjang
          </Link>
        </div>
      </form>
    </div>
  );
}
