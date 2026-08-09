'use client';

import { useEffect, useState } from 'react';

import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

type StoreSettingForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  defaultShippingCost: string;
  freeShippingMinTotal: string;
  bank1Name: string;
  bank1Number: string;
  bank1Holder: string;
  bank2Name: string;
  bank2Number: string;
  bank2Holder: string;
};

const EMPTY_FORM: StoreSettingForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  defaultShippingCost: '0',
  freeShippingMinTotal: '0',
  bank1Name: '',
  bank1Number: '',
  bank1Holder: '',
  bank2Name: '',
  bank2Number: '',
  bank2Holder: '',
};

const RESET_CONFIRM_PHRASE = 'RESET SEMUA PESANAN';

export default function AdminPengaturanPage() {
  const [form, setForm] = useState<StoreSettingForm>(EMPTY_FORM);
  const [admin, setAdmin] = useState<{ name: string | null; email: string } | null>(null);
  const [storage, setStorage] = useState<{
    orderCount: number;
    productCount: number;
    memberCount: number;
  } | null>(null);
  const [canResetOrders, setCanResetOrders] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [resetStep, setResetStep] = useState(0);
  const [resetInput, setResetInput] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch('/api/admin/settings/store');
      if (response.ok) {
        const data = await response.json();
        if (data.setting) {
          setForm({
            name: data.setting.name,
            email: data.setting.email,
            phone: data.setting.phone,
            address: data.setting.address,
            defaultShippingCost: String(data.setting.defaultShippingCost),
            freeShippingMinTotal: String(data.setting.freeShippingMinTotal),
            bank1Name: data.setting.bank1Name,
            bank1Number: data.setting.bank1Number,
            bank1Holder: data.setting.bank1Holder,
            bank2Name: data.setting.bank2Name,
            bank2Number: data.setting.bank2Number,
            bank2Holder: data.setting.bank2Holder,
          });
        }
        setAdmin(data.admin);
        setStorage(data.storage);
        setCanResetOrders(data.canResetOrders);
      }
      setLoading(false);
    }
    load();
  }, []);

  function updateField(field: keyof StoreSettingForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const response = await fetch('/api/admin/settings/store', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        defaultShippingCost: Number(form.defaultShippingCost),
        freeShippingMinTotal: Number(form.freeShippingMinTotal),
      }),
    });

    setSaving(false);
    setSaveMessage(response.ok ? 'Pengaturan berhasil disimpan!' : 'Gagal menyimpan pengaturan.');
  }

  async function handleConfirmReset() {
    setResetting(true);
    setResetMessage(null);

    const response = await fetch('/api/admin/settings/reset-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirm: resetInput }),
    });

    setResetting(false);

    if (response.ok) {
      setResetMessage('Semua data pesanan berhasil direset.');
      setStorage((prev) => (prev ? { ...prev, orderCount: 0 } : prev));
    } else {
      const data = await response.json().catch(() => null);
      setResetMessage(data?.error ?? 'Gagal mereset data pesanan.');
    }

    setResetStep(0);
    setResetInput('');
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat data...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan Toko</h1>
        <p className="mt-1 text-sm text-neutral-500">Konfigurasi data toko dan pembayaran</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h3 className="font-semibold text-foreground">Informasi Toko</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="storeName" className="text-xs font-medium text-neutral-600">
              Nama Toko
            </label>
            <input
              id="storeName"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="storeEmail" className="text-xs font-medium text-neutral-600">
              Email Toko
            </label>
            <input
              id="storeEmail"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="storePhone" className="text-xs font-medium text-neutral-600">
              Telepon Toko
            </label>
            <input
              id="storePhone"
              type="text"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="storeAddress" className="text-xs font-medium text-neutral-600">
              Alamat Toko
            </label>
            <input
              id="storeAddress"
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h3 className="font-semibold text-foreground">Rekening Bank</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="bank1Name" className="text-xs font-medium text-neutral-600">
              Nama Bank 1
            </label>
            <input
              id="bank1Name"
              type="text"
              value={form.bank1Name}
              onChange={(e) => updateField('bank1Name', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bank1Number" className="text-xs font-medium text-neutral-600">
              No. Rekening 1
            </label>
            <input
              id="bank1Number"
              type="text"
              value={form.bank1Number}
              onChange={(e) => updateField('bank1Number', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bank1Holder" className="text-xs font-medium text-neutral-600">
              Atas Nama 1
            </label>
            <input
              id="bank1Holder"
              type="text"
              value={form.bank1Holder}
              onChange={(e) => updateField('bank1Holder', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bank2Name" className="text-xs font-medium text-neutral-600">
              Nama Bank 2
            </label>
            <input
              id="bank2Name"
              type="text"
              value={form.bank2Name}
              onChange={(e) => updateField('bank2Name', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bank2Number" className="text-xs font-medium text-neutral-600">
              No. Rekening 2
            </label>
            <input
              id="bank2Number"
              type="text"
              value={form.bank2Number}
              onChange={(e) => updateField('bank2Number', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bank2Holder" className="text-xs font-medium text-neutral-600">
              Atas Nama 2
            </label>
            <input
              id="bank2Holder"
              type="text"
              value={form.bank2Holder}
              onChange={(e) => updateField('bank2Holder', e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h3 className="font-semibold text-foreground">Pengiriman</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="shippingCost" className="text-xs font-medium text-neutral-600">
              Ongkos Kirim Default (Rp)
            </label>
            <input
              id="shippingCost"
              type="number"
              min={0}
              value={form.defaultShippingCost}
              onChange={(e) => updateField('defaultShippingCost', e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="freeShippingMin" className="text-xs font-medium text-neutral-600">
              Minimum Gratis Ongkir (Rp)
            </label>
            <input
              id="freeShippingMin"
              type="number"
              min={0}
              value={form.freeShippingMinTotal}
              onChange={(e) => updateField('freeShippingMinTotal', e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h3 className="font-semibold text-foreground">Data Admin</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="adminName" className="text-xs font-medium text-neutral-600">
              Nama Admin
            </label>
            <input
              id="adminName"
              type="text"
              value={admin?.name ?? ''}
              readOnly
              className={`${inputBase} bg-neutral-50 text-neutral-500`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="adminEmail" className="text-xs font-medium text-neutral-600">
              Email Admin
            </label>
            <input
              id="adminEmail"
              type="email"
              value={admin?.email ?? ''}
              readOnly
              className={`${inputBase} bg-neutral-50 text-neutral-500`}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saveMessage ? <p className="text-sm text-neutral-600">{saveMessage}</p> : null}
        <button type="button" disabled={saving} onClick={handleSave} className={btnSolid}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h3 className="font-semibold text-foreground">Data Storage</h3>
        <p className="text-xs text-neutral-500">
          Ringkasan jumlah data yang tersimpan di database.
        </p>
        {storage ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-100 p-3">
              <p className="text-xs text-neutral-500">Pesanan</p>
              <p className="text-lg font-bold text-foreground">{storage.orderCount}</p>
            </div>
            <div className="rounded-md border border-neutral-100 p-3">
              <p className="text-xs text-neutral-500">Produk</p>
              <p className="text-lg font-bold text-foreground">{storage.productCount}</p>
            </div>
            <div className="rounded-md border border-neutral-100 p-3">
              <p className="text-xs text-neutral-500">Member</p>
              <p className="text-lg font-bold text-foreground">{storage.memberCount}</p>
            </div>
          </div>
        ) : null}

        {canResetOrders ? (
          <div className="mt-2 flex flex-col gap-2">
            {resetStep === 0 ? (
              <button
                type="button"
                onClick={() => setResetStep(1)}
                className={`${btnOutline} w-fit border-red text-red hover:bg-red/5`}
              >
                Reset Semua Pesanan
              </button>
            ) : null}

            {resetStep === 1 ? (
              <div className="flex flex-col gap-2 rounded-md border border-red/30 bg-red/5 p-3">
                <p className="text-sm font-medium text-red">
                  Tindakan ini akan menghapus seluruh data pesanan secara permanen. Yakin ingin
                  melanjutkan?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(2)}
                    className={`${btnOutline} border-red text-red hover:bg-red/10`}
                  >
                    Ya, Lanjutkan
                  </button>
                  <button type="button" onClick={() => setResetStep(0)} className={btnOutline}>
                    Batal
                  </button>
                </div>
              </div>
            ) : null}

            {resetStep === 2 ? (
              <div className="flex flex-col gap-2 rounded-md border border-red/30 bg-red/5 p-3">
                <p className="text-sm font-medium text-red">
                  Ketik &quot;{RESET_CONFIRM_PHRASE}&quot; untuk mengonfirmasi.
                </p>
                <input
                  type="text"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  className={inputBase}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={resetInput !== RESET_CONFIRM_PHRASE || resetting}
                    onClick={handleConfirmReset}
                    className={`${btnOutline} border-red text-red hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {resetting ? 'Mereset...' : 'Reset Sekarang'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(0);
                      setResetInput('');
                    }}
                    className={btnOutline}
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : null}

            {resetMessage ? <p className="text-sm text-neutral-600">{resetMessage}</p> : null}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            Reset pesanan hanya tersedia di lingkungan development.
          </p>
        )}
      </div>
    </div>
  );
}
