'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnOutline, btnSolid, cardBase, inputBase } from '@/lib/styles';

type City = { id: string; name: string; province: string };

type Receiver = {
  id: string;
  label: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  isDefault: boolean;
  city: { name: string; shippingCost: number };
  cityId?: string;
};

const receiverFormSchema = z.object({
  label: z.string().trim().min(1, 'Label wajib diisi'),
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  phone: z.string().trim().min(1, 'Nomor telepon wajib diisi'),
  email: z.union([z.string().trim().email('Format email tidak valid'), z.literal('')]),
  address: z.string().trim().min(1, 'Alamat wajib diisi'),
  cityId: z.string().uuid('Kota tujuan wajib dipilih'),
  isDefault: z.boolean(),
});

type ReceiverFormValues = z.infer<typeof receiverFormSchema>;

function ReceiverModal({
  cities,
  editing,
  onClose,
  onSaved,
}: {
  cities: City[];
  editing: Receiver | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceiverFormValues>({
    resolver: zodResolver(receiverFormSchema),
    defaultValues: {
      label: editing?.label ?? '',
      name: editing?.name ?? '',
      phone: editing?.phone ?? '',
      email: editing?.email ?? '',
      address: editing?.address ?? '',
      cityId: editing?.cityId ?? '',
      isDefault: editing?.isDefault ?? false,
    },
  });

  async function onSubmit(values: ReceiverFormValues) {
    setApiError(null);
    try {
      const payload = { ...values, email: values.email === '' ? undefined : values.email };
      const response = await fetch(
        editing ? `/api/member/receivers/${editing.id}` : '/api/member/receivers',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setApiError(data.error ?? 'Gagal menyimpan penerima');
        return;
      }
      onSaved();
    } catch {
      setApiError('Gagal menyimpan penerima');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {editing ? 'Ubah Penerima' : 'Tambah Penerima'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-neutral-400 hover:text-neutral-600"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Label</label>
            <input
              type="text"
              placeholder="Rumah, Kantor, dll"
              {...register('label')}
              className={inputBase}
            />
            {errors.label ? <p className="text-xs text-red">{errors.label.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Nama Penerima</label>
            <input type="text" {...register('name')} className={inputBase} />
            {errors.name ? <p className="text-xs text-red">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">No. WhatsApp / Telepon</label>
            <input
              type="tel"
              placeholder="08xxxxxxxxxx"
              {...register('phone')}
              className={inputBase}
            />
            {errors.phone ? <p className="text-xs text-red">{errors.phone.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Email (opsional)</label>
            <input type="email" {...register('email')} className={inputBase} />
            {errors.email ? <p className="text-xs text-red">{errors.email.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Kota</label>
            <select
              {...register('cityId')}
              className={inputBase}
              defaultValue={editing?.cityId ?? ''}
            >
              <option value="" disabled>
                Pilih kota
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.province}
                </option>
              ))}
            </select>
            {errors.cityId ? <p className="text-xs text-red">{errors.cityId.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Alamat Lengkap</label>
            <textarea {...register('address')} rows={3} className={inputBase} />
            {errors.address ? <p className="text-xs text-red">{errors.address.message}</p> : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" {...register('isDefault')} />
            Jadikan alamat utama
          </label>

          {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={btnOutline}>
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className={btnSolid}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MemberPenerimaPage() {
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receiver | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadReceivers() {
    const response = await fetch('/api/member/receivers');
    if (response.ok) {
      const data: { items: Receiver[] } = await response.json();
      setReceivers(data.items);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      const [receiversResponse, citiesResponse] = await Promise.all([
        fetch('/api/member/receivers'),
        fetch('/api/shipping/cities'),
      ]);
      if (receiversResponse.ok) {
        const data: { items: Receiver[] } = await receiversResponse.json();
        setReceivers(data.items);
      }
      if (citiesResponse.ok) {
        const data: { items: City[] } = await citiesResponse.json();
        setCities(data.items);
      }
      setLoading(false);
    }
    bootstrap();
  }, []);

  function openAddModal() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditModal(receiver: Receiver) {
    setEditing(receiver);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSaved() {
    closeModal();
    await loadReceivers();
  }

  async function handleDelete(receiver: Receiver) {
    if (!confirm(`Hapus penerima "${receiver.name}"?`)) return;

    setDeleteError(null);
    try {
      const response = await fetch(`/api/member/receivers/${receiver.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        setDeleteError(data.error ?? 'Gagal menghapus penerima');
        return;
      }
      await loadReceivers();
    } catch {
      setDeleteError('Gagal menghapus penerima');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Penerima</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Kelola daftar penerima untuk mempermudah checkout berikutnya.
          </p>
        </div>
        <button type="button" onClick={openAddModal} className={btnSolid}>
          Tambah Penerima
        </button>
      </div>

      {deleteError ? <p className="text-sm text-red">{deleteError}</p> : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat penerima...</p>
      ) : receivers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">Belum ada penerima tersimpan.</p>
          <button type="button" onClick={openAddModal} className={btnSolid}>
            Tambah Penerima
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {receivers.map((receiver) => (
            <div key={receiver.id} className={`p-4 ${cardBase}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{receiver.label}</p>
                  {receiver.isDefault ? (
                    <span className="text-xs font-medium text-brand">Alamat Utama</span>
                  ) : null}
                </div>
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => openEditModal(receiver)}
                    className="font-medium text-brand hover:underline"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(receiver)}
                    className="font-medium text-red hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-neutral-600">
                <p className="font-medium text-foreground">{receiver.name}</p>
                <p>{receiver.phone}</p>
                {receiver.email ? <p>{receiver.email}</p> : null}
                <p className="mt-1">
                  {receiver.address}, {receiver.city.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <ReceiverModal
          cities={cities}
          editing={editing}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
