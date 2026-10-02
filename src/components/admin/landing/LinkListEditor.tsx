'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

import { ChevronDownIcon } from '@/components/admin/ui/icons';
import {
  adminBtnOutlineSm,
  adminErrorText,
  adminHelpText,
  adminInputBase,
  adminLabelBase,
} from '@/lib/admin/styles';
import { LANDING_ICONS } from '@/server/landing/schema';
import type { LandingContent } from '@/server/landing/schema';

export type LandingLink = LandingContent['links'][number];

type Props = {
  items: LandingLink[];
  onChange: (items: LandingLink[]) => void;
  /** Path prefix used to look up validation errors, e.g. "links" or "marketplace.items". */
  path: string;
  errors: Record<string, string>;
  maxItems: number;
  noun: string;
  withDescription?: boolean;
  withFeatured?: boolean;
};

const CUSTOM_IMAGE = '__image__';

function newItem(): LandingLink {
  return {
    id: `item-${crypto.randomUUID().slice(0, 8)}`,
    label: '',
    description: '',
    href: 'https://',
    icon: 'LinkSimple',
    visible: true,
  };
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={adminLabelBase}>{label}</span>
      {children}
      {error ? <span className={adminErrorText}>{error}</span> : null}
    </label>
  );
}

function Row({
  item,
  index,
  path,
  errors,
  open,
  onToggle,
  onPatch,
  onRemove,
  withDescription,
  withFeatured,
}: {
  item: LandingLink;
  index: number;
  open: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<LandingLink>) => void;
  onRemove: () => void;
} & Pick<Props, 'path' | 'errors' | 'withDescription' | 'withFeatured'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const base = `${path}.${index}`;
  const rowHasError = Object.keys(errors).some((key) => key.startsWith(`${base}.`));
  const iconValue = item.iconSrc ? CUSTOM_IMAGE : (item.icon ?? 'LinkSimple');

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border bg-white ${
        rowHasError ? 'border-red/50' : 'border-neutral-200'
      } ${isDragging ? 'z-10 shadow-theme-sm' : ''}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          aria-label={`Geser ${item.label || 'item'}. Tekan spasi lalu tombol panah untuk memindahkan.`}
          className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <circle cx="7" cy="5" r="1.4" />
            <circle cx="13" cy="5" r="1.4" />
            <circle cx="7" cy="10" r="1.4" />
            <circle cx="13" cy="10" r="1.4" />
            <circle cx="7" cy="15" r="1.4" />
            <circle cx="13" cy="15" r="1.4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-sm font-medium ${
                item.visible ? 'text-foreground' : 'text-neutral-400 line-through'
              }`}
            >
              {item.label || '(tanpa nama)'}
            </span>
            <span className="block truncate text-xs text-neutral-500">{item.href}</span>
          </span>
          {item.featured ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-2xs font-medium text-brand-700">
              Sorotan
            </span>
          ) : null}
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={item.visible}
            onChange={(event) => onPatch({ visible: event.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          Tampil
        </label>
      </div>

      {open ? (
        <div className="grid gap-4 border-t border-neutral-200 px-4 py-4 sm:grid-cols-2">
          <Field label="Nama" error={errors[`${base}.label`]}>
            <input
              className={adminInputBase}
              value={item.label}
              maxLength={80}
              onChange={(event) => onPatch({ label: event.target.value })}
            />
          </Field>
          <Field label="Link tujuan" error={errors[`${base}.href`]}>
            <input
              className={adminInputBase}
              value={item.href}
              inputMode="url"
              onChange={(event) => onPatch({ href: event.target.value })}
            />
          </Field>
          {withDescription ? (
            <div className="sm:col-span-2">
              <Field label="Deskripsi singkat" error={errors[`${base}.description`]}>
                <input
                  className={adminInputBase}
                  value={item.description ?? ''}
                  maxLength={140}
                  onChange={(event) => onPatch({ description: event.target.value })}
                />
              </Field>
            </div>
          ) : null}
          <Field label="Ikon" error={errors[`${base}.icon`] ?? errors[`${base}.iconSrc`]}>
            <select
              className={adminInputBase}
              value={iconValue}
              onChange={(event) => {
                const value = event.target.value;
                if (value === CUSTOM_IMAGE) return;
                onPatch({ icon: value as LandingLink['icon'], iconSrc: undefined });
              }}
            >
              {item.iconSrc ? <option value={CUSTOM_IMAGE}>Gambar: {item.iconSrc}</option> : null}
              {LANDING_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <span className={adminHelpText}>
              Gambar ikon baru belum bisa diunggah dari sini. Ikon gambar yang sudah ada tetap
              dipakai sampai Anda memilih ikon lain.
            </span>
          </Field>
          <div className="flex items-end justify-between gap-3">
            {withFeatured ? (
              <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={item.featured ?? false}
                  onChange={(event) => onPatch({ featured: event.target.checked || undefined })}
                  className="h-4 w-4 accent-brand"
                />
                Tampilkan sebagai sorotan
              </label>
            ) : (
              <span />
            )}
            <button type="button" onClick={onRemove} className={`${adminBtnOutlineSm} text-red`}>
              Hapus
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function LinkListEditor({
  items,
  onChange,
  path,
  errors,
  maxItems,
  noun,
  withDescription = false,
  withFeatured = false,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  }

  function addItem() {
    const item = newItem();
    onChange([...items, item]);
    setOpenId(item.id);
  }

  const listError = errors[path];

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <Row
                key={item.id}
                item={item}
                index={index}
                path={path}
                errors={errors}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                onPatch={(patch) =>
                  onChange(
                    items.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)),
                  )
                }
                onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}
                withDescription={withDescription}
                withFeatured={withFeatured}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
          Belum ada {noun}.
        </p>
      ) : null}
      {listError ? <p className={adminErrorText}>{listError}</p> : null}

      <div className="flex items-center justify-between">
        <span className={adminHelpText}>
          {items.length} dari {maxItems} {noun}
        </span>
        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= maxItems}
          className={adminBtnOutlineSm}
        >
          + Tambah {noun}
        </button>
      </div>
    </div>
  );
}
