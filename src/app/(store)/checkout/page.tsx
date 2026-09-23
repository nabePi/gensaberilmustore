'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DestinationSelect } from '@/components/ui/DestinationSelect';
import { blockNewlineKeyDown, sanitizeAddress } from '@/lib/address';
import { dispatchCartUpdated } from '@/lib/cart-events';
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

const SNAP_ENABLED = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_ENABLED === 'true';
const SNAP_SCRIPT_URL =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
const AFFILIATE_COOKIE_NAME = 'gsb_aff';

function readAffiliateCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${AFFILIATE_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

const JNE_SERVICE_OPTIONS = [
  { value: 'REG', label: 'REG (Reguler)' },
  { value: 'YES', label: 'YES (Yakin Esok Sampai)' },
  { value: 'JTR', label: 'JTR (Trucking)' },
] as const;

const SHIPPING_METHOD_OPTIONS = [
  { value: 'JNE', label: 'JNE' },
  { value: 'SELF_PICKUP', label: 'Ambil Sendiri' },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: 'QRIS', label: 'QRIS' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank Manual' },
] as const;

const STORE_PICKUP_ADDRESS = {
  text: 'Jalan Margonda Raya Gang H. Fatimah Bawah Rt 02/014 No. 8, Kemiri Muka, Beji, Kota Depok, Jawa Barat 16423',
  mapsUrl: 'https://goo.gl/maps/892nKq5dhNm',
};

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

type Receiver = {
  id: string;
  label: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  destinationId: string;
  isDefault: boolean;
  destination: {
    provinceName: string;
    cityName: string;
    districtName: string;
    subdistrictName: string;
    zipCode: string;
  };
};

type SessionUser = { id: string; email: string; name: string | null };

type VoucherResult =
  | { valid: true; voucherId: string; code: string; discountAmount: number }
  | { valid: false; reason: string };

type PublicVoucher = {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minPurchase: number;
  eligible: boolean;
  discountAmount: number;
};

const PHONE_PREFIX = '62';

function normalizePhone(localNumber: string): string {
  const digits = localNumber.replace(/\D/g, '').replace(/^0+/, '');
  return `${PHONE_PREFIX}${digits}`;
}

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)].filter(Boolean).join(' - ');
}

const checkoutSchema = z
  .object({
    mode: z.enum(['receiver', 'manual']),
    receiverId: z.string().optional(),
    receiverName: z.string().optional(),
    receiverPhone: z.string().optional(),
    receiverEmail: z.string().optional(),
    receiverAddress: z
      .string()
      .optional()
      .transform((value) => (value ? sanitizeAddress(value) : value)),
    destinationId: z.string().optional(),
    shippingMethod: z.enum(['JNE', 'SELF_PICKUP']),
    service: z.string().optional(),
    paymentMethod: z.enum(['QRIS', 'BANK_TRANSFER']),
    note: z.string().max(500).optional(),
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
    const phoneDigits = (data.receiverPhone ?? '').replace(/\D/g, '').replace(/^0+/, '');
    if (!data.receiverPhone) {
      ctx.addIssue({
        code: 'custom',
        path: ['receiverPhone'],
        message: 'Nomor telepon wajib diisi',
      });
    } else if (phoneDigits.length < 8 || phoneDigits.length > 13) {
      ctx.addIssue({
        code: 'custom',
        path: ['receiverPhone'],
        message: 'Nomor telepon tidak valid',
      });
    }
    if (!data.receiverEmail) {
      ctx.addIssue({ code: 'custom', path: ['receiverEmail'], message: 'Email wajib diisi' });
    } else if (!z.string().email().safeParse(data.receiverEmail).success) {
      ctx.addIssue({
        code: 'custom',
        path: ['receiverEmail'],
        message: 'Format email tidak valid',
      });
    }
    if (data.shippingMethod === 'JNE' && !data.receiverAddress) {
      ctx.addIssue({ code: 'custom', path: ['receiverAddress'], message: 'Alamat wajib diisi' });
    }
    if (data.shippingMethod === 'JNE' && !data.destinationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['destinationId'],
        message: 'Tujuan pengiriman wajib dipilih',
      });
    }
  });

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherResult, setVoucherResult] = useState<VoucherResult | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [publicVouchers, setPublicVouchers] = useState<PublicVoucher[]>([]);
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
    defaultValues: { mode: 'manual', shippingMethod: 'JNE', service: 'REG', paymentMethod: 'QRIS' },
  });

  const mode = watch('mode');
  const selectedReceiverId = watch('receiverId');
  const selectedDestinationId = watch('destinationId');
  const selectedService = watch('service');
  const selectedShippingMethod = watch('shippingMethod');
  const selectedPaymentMethod = watch('paymentMethod');

  const [shippingOptions, setShippingOptions] = useState<
    { service: string; shippingCost: number; etd: string }[]
  >([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const receiverPhoneField = register('receiverPhone');

  useEffect(() => {
    async function bootstrap() {
      const [cartResponse, sessionResponse] = await Promise.all([
        fetch('/api/cart'),
        fetch('/api/auth/session'),
      ]);

      const cartData: Cart = await cartResponse.json();
      if (cartData.items.length === 0) {
        router.replace('/cart');
        return;
      }
      setCart(cartData);

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

  useEffect(() => {
    if (!cart) return;
    let active = true;

    async function loadPublicVouchers() {
      const params = new URLSearchParams({
        subtotal: String(cart!.subtotal),
        channel: 'ONLINE',
      });
      const response = await fetch(`/api/vouchers/public?${params.toString()}`);
      if (!response.ok) return;
      const data: { items: PublicVoucher[] } = await response.json();
      if (active) setPublicVouchers(data.items);
    }

    loadPublicVouchers();
    return () => {
      active = false;
    };
  }, [cart]);

  async function applyVoucherCode(code: string) {
    if (!code.trim() || !cart) return;
    setVoucherLoading(true);
    try {
      const response = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          subtotal: cart.subtotal,
          channel: 'ONLINE',
        }),
      });
      const data: VoucherResult = await response.json();
      setVoucherResult(data);
      setVoucherInput(code.trim().toUpperCase());
    } finally {
      setVoucherLoading(false);
    }
  }

  async function handleVoucherApply() {
    await applyVoucherCode(voucherInput);
  }

  function handleVoucherRemove() {
    setVoucherResult(null);
    setVoucherInput('');
  }

  const activeDestinationId =
    mode === 'receiver'
      ? receivers.find((item) => item.id === selectedReceiverId)?.destinationId
      : selectedDestinationId;

  useEffect(() => {
    if (!activeDestinationId || selectedShippingMethod === 'SELF_PICKUP') {
      setShippingOptions([]);
      setShippingError(null);
      setShippingLoading(false);
      return;
    }

    let active = true;
    setShippingLoading(true);
    setShippingError(null);

    fetch('/api/shipping/tariff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationId: activeDestinationId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setShippingError(data.error ?? 'Gagal menghitung ongkos kirim');
          setShippingOptions([]);
          return;
        }
        setShippingOptions(data.options);
        if (
          !data.options.some((option: { service: string }) => option.service === selectedService)
        ) {
          setValue('service', data.options[0]?.service ?? 'REG');
        }
      })
      .catch(() => {
        if (active) {
          setShippingError('Gagal menghitung ongkos kirim');
          setShippingOptions([]);
        }
      })
      .finally(() => {
        if (active) setShippingLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDestinationId, selectedShippingMethod]);

  const shippingCost =
    selectedShippingMethod === 'SELF_PICKUP'
      ? 0
      : (shippingOptions.find((option) => option.service === selectedService)?.shippingCost ?? 0);

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
            shippingMethod: values.shippingMethod,
            service: values.service,
            paymentMethod: values.paymentMethod,
            note: values.note,
            voucherCode: voucherResult && voucherResult.valid ? voucherResult.code : undefined,
            affiliateCode,
          }
        : {
            receiverName: values.receiverName,
            receiverPhone: normalizePhone(values.receiverPhone ?? ''),
            receiverEmail: values.receiverEmail?.trim() ? values.receiverEmail.trim() : undefined,
            receiverAddress: values.receiverAddress,
            destinationId: values.destinationId,
            shippingMethod: values.shippingMethod,
            service: values.service,
            paymentMethod: values.paymentMethod,
            note: values.note,
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
      dispatchCartUpdated();
      const redirectToSuccess = () => router.push(`/payment/success?orderId=${orderId}`);

      if (!SNAP_ENABLED) {
        redirectToSuccess();
        return;
      }

      const paymentResponse = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (!paymentResponse.ok) {
        const paymentError: { error?: string } = await paymentResponse.json().catch(() => ({}));
        setSubmitError(
          paymentError.error ??
            'Gagal memulai pembayaran. Pesanan Anda sudah dibuat, silakan lanjutkan dari halaman pesanan.',
        );
        setSubmitting(false);
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
      {SNAP_ENABLED ? (
        <Script
          src={SNAP_SCRIPT_URL}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
          onError={() => {
            snapFailedRef.current = true;
          }}
        />
      ) : null}
      <h1 className="mb-6 text-2xl font-bold text-foreground">Checkout</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-8 lg:grid-cols-[1fr_320px]"
      >
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
                    <span className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">
                        {receiver.label} &middot; {receiver.name}
                      </span>
                      <span className="text-neutral-600">
                        <span className="font-semibold text-neutral-700">No. Telepon:</span>{' '}
                        {receiver.phone}
                      </span>
                      <span className="text-neutral-600">
                        <span className="font-semibold text-neutral-700">Alamat:</span>{' '}
                        {receiver.address}
                      </span>
                      <span className="text-neutral-600">
                        <span className="font-semibold text-neutral-700">Provinsi:</span>{' '}
                        {receiver.destination.provinceName}
                      </span>
                      <span className="text-neutral-600">
                        <span className="font-semibold text-neutral-700">Kota/Kabupaten:</span>{' '}
                        {receiver.destination.cityName}
                      </span>
                      <span className="text-neutral-600">
                        <span className="font-semibold text-neutral-700">Kecamatan:</span>{' '}
                        {receiver.destination.districtName}
                      </span>
                      <span className="text-neutral-600">
                        <span className="font-semibold text-neutral-700">Kelurahan:</span>{' '}
                        {receiver.destination.subdistrictName}
                      </span>
                      <span className="text-neutral-600">
                        <span className="font-semibold text-neutral-700">Kode Pos:</span>{' '}
                        {receiver.destination.zipCode}
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
                  <label className="text-xs font-medium text-neutral-600">
                    Nama Penerima <span className="text-red">*</span>
                  </label>
                  <input {...register('receiverName')} className={inputBase} />
                  {errors.receiverName ? (
                    <p className="text-xs text-red">{errors.receiverName.message}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Nomor Telepon / WhatsApp <span className="text-red">*</span>
                  </label>
                  <div className="flex">
                    <span className="flex items-center rounded-sm rounded-r-none border border-r-0 border-neutral-200 bg-neutral-50 px-2.5 py-2.5 text-sm text-neutral-600">
                      +{PHONE_PREFIX}
                    </span>
                    <input
                      {...receiverPhoneField}
                      onChange={(event) => {
                        event.target.value = formatPhoneDisplay(event.target.value);
                        receiverPhoneField.onChange(event);
                      }}
                      inputMode="numeric"
                      placeholder="812 - 3456 - 7890"
                      className={`${inputBase} rounded-l-none`}
                    />
                  </div>
                  {errors.receiverPhone ? (
                    <p className="text-xs text-red">{errors.receiverPhone.message}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Email <span className="text-red">*</span>
                  </label>
                  <input
                    type="email"
                    {...register('receiverEmail')}
                    placeholder="Untuk menerima notifikasi pesanan"
                    className={inputBase}
                  />
                  {errors.receiverEmail ? (
                    <p className="text-xs text-red">{errors.receiverEmail.message}</p>
                  ) : null}
                </div>
                {selectedShippingMethod === 'JNE' ? (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Tujuan Pengiriman
                    </label>
                    <DestinationSelect
                      hasError={Boolean(errors.destinationId)}
                      onChange={(value) =>
                        setValue('destinationId', value?.destinationId ?? '', {
                          shouldValidate: true,
                        })
                      }
                    />
                    {errors.destinationId ? (
                      <p className="text-xs text-red">{errors.destinationId.message}</p>
                    ) : null}
                  </div>
                ) : null}
                {selectedShippingMethod === 'JNE' ? (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Alamat Lengkap <span className="text-red">*</span>
                    </label>
                    <textarea
                      {...register('receiverAddress')}
                      onKeyDown={blockNewlineKeyDown}
                      rows={3}
                      className={inputBase}
                    />
                    {errors.receiverAddress ? (
                      <p className="text-xs text-red">{errors.receiverAddress.message}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Catatan (opsional)</label>
              <textarea {...register('note')} rows={2} className={inputBase} />
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
            <label className="text-xs font-medium text-neutral-600">Metode Pengiriman</label>
            <div className="grid grid-cols-2 gap-2">
              {SHIPPING_METHOD_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-sm border p-2.5 text-xs font-medium ${
                    selectedShippingMethod === option.value
                      ? 'border-brand bg-brand-50 text-brand'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    checked={selectedShippingMethod === option.value}
                    onChange={() => setValue('shippingMethod', option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {selectedShippingMethod === 'JNE' ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-sm border border-neutral-200 bg-neutral-50 p-3">
                <img src="/jne.png" alt="JNE" className="h-8 w-auto shrink-0 object-contain" />
                <p className="text-xs text-neutral-600">
                  Buku akan dikirim menggunakan jasa pengiriman{' '}
                  <span className="font-semibold">JNE</span>.
                </p>
              </div>

              <div className="mb-4 flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-600">Layanan Pengiriman</label>
                <select
                  {...register('service')}
                  className={inputBase}
                  disabled={shippingOptions.length === 0}
                >
                  {shippingOptions.length > 0
                    ? shippingOptions.map((option) => (
                        <option key={option.service} value={option.service}>
                          {option.service} &middot; {formatCurrency(option.shippingCost)} &middot;{' '}
                          {option.etd}
                        </option>
                      ))
                    : JNE_SERVICE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                </select>
              </div>
            </>
          ) : (
            <div className="mb-4 flex flex-col gap-1.5 rounded-sm border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-600">
                Pesanan bisa diambil langsung di toko Gensa Berilmu. Tidak ada ongkos kirim untuk
                metode ini.
              </p>
              <p className="text-xs font-semibold text-foreground">{STORE_PICKUP_ADDRESS.text}</p>
              <a
                href={STORE_PICKUP_ADDRESS.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand hover:underline"
              >
                Lihat lokasi di Google Maps
              </a>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-sm border p-2.5 text-xs font-medium ${
                    selectedPaymentMethod === option.value
                      ? 'border-brand bg-brand-50 text-brand'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    checked={selectedPaymentMethod === option.value}
                    onChange={() => setValue('paymentMethod', option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {selectedPaymentMethod === 'BANK_TRANSFER' ? (
              <p className="text-xs text-neutral-500">
                Anda akan mentransfer manual ke rekening toko dan mengunggah bukti pembayaran
                setelah pesanan dibuat.
              </p>
            ) : null}
          </div>

          {publicVouchers.length > 0 ? (
            <div className="mb-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-neutral-600">Voucher Tersedia</p>
              <div className="flex flex-col gap-2">
                {publicVouchers.map((voucher) => {
                  const selected = voucherResult?.valid && voucherResult.code === voucher.code;
                  return (
                    <label
                      key={voucher.id}
                      className={`flex cursor-pointer items-start gap-2 rounded-sm border p-3 text-sm ${
                        selected
                          ? 'border-brand bg-brand-50'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      } ${!voucher.eligible ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="radio"
                        name="publicVoucher"
                        className="mt-1"
                        checked={Boolean(selected)}
                        disabled={!voucher.eligible || voucherLoading}
                        onChange={() => applyVoucherCode(voucher.code)}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium text-foreground">{voucher.code}</span>
                        {voucher.description ? (
                          <span className="text-xs text-neutral-500">{voucher.description}</span>
                        ) : null}
                        <span className="text-xs text-neutral-500">
                          {voucher.eligible
                            ? `Hemat ${formatCurrency(voucher.discountAmount)}`
                            : `Minimal belanja ${formatCurrency(voucher.minPurchase)}`}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

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
              <span>{shippingLoading ? 'Menghitung...' : formatCurrency(shippingCost)}</span>
            </div>
            {shippingError ? <p className="text-xs text-red">{shippingError}</p> : null}
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

          <button
            type="submit"
            disabled={
              submitting ||
              (selectedShippingMethod === 'JNE' &&
                (!activeDestinationId || shippingLoading || Boolean(shippingError)))
            }
            className={`${btnSolid} mt-5 w-full`}
          >
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
