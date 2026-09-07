'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { useState } from 'react';

import {
  BarChartIcon,
  BoxIcon,
  CartIcon,
  ChevronDownIcon,
  ClipboardIcon,
  DocumentIcon,
  GridIcon,
  LayersIcon,
  ReceiptIcon,
  SettingsIcon,
  ShareIcon,
  TagIcon,
  UsersIcon,
  VoucherIcon,
} from '@/components/admin/ui/icons';

type NavLeaf = { href: string; label: string; icon?: ComponentType<{ className?: string }> };
type NavItem = NavLeaf | (NavLeaf & { children: NavLeaf[] });

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operasional',
    items: [
      { href: '/admin', label: 'Dashboard', icon: GridIcon },
      { href: '/admin/pesanan', label: 'Pesanan', icon: ReceiptIcon },
      { href: '/admin/board', label: 'Board', icon: LayersIcon },
      { href: '/admin/fulfillment', label: 'Fulfillment', icon: ClipboardIcon },
      { href: '/admin/pos', label: 'POS', icon: CartIcon },
    ],
  },
  {
    label: 'Katalog',
    items: [
      { href: '/admin/produk', label: 'Produk', icon: BoxIcon },
      { href: '/admin/kategori', label: 'Kategori', icon: TagIcon },
      { href: '/admin/blog', label: 'Blog', icon: DocumentIcon },
      { href: '/admin/voucher', label: 'Voucher', icon: VoucherIcon },
    ],
  },
  {
    label: 'Lainnya',
    items: [
      { href: '/admin/member', label: 'Member', icon: UsersIcon },
      { href: '/admin/afiliasi', label: 'Afiliasi', icon: ShareIcon },
      { href: '/admin/laporan', label: 'Laporan', icon: BarChartIcon },
      { href: '/admin/laporan-lengkap', label: 'Laporan Lengkap', icon: BarChartIcon },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      {
        href: '/admin/konfigurasi',
        label: 'Konfigurasi',
        icon: SettingsIcon,
        children: [
          { href: '/admin/konfigurasi', label: 'Umum' },
          { href: '/admin/konfigurasi/section', label: 'Section' },
          { href: '/admin/konfigurasi/kids', label: 'Kids' },
          { href: '/admin/konfigurasi/kids/section', label: 'Kids Section' },
        ],
      },
      { href: '/admin/pengaturan', label: 'Pengaturan', icon: SettingsIcon },
    ],
  },
];

export function AdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Konfigurasi: true });

  return (
    <nav className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed ? (
            <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-neutral-400">
              {group.label}
            </p>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if ('children' in item && !collapsed) {
                const isExpanded = expanded[item.label] ?? false;
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [item.label]: !prev[item.label] }))
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        active ? 'bg-brand-50 text-brand' : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
                        {item.label}
                      </span>
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isExpanded ? (
                      <div className="ml-[26px] mt-0.5 flex flex-col gap-0.5 border-l border-neutral-200 pl-3.5">
                        {item.children.map((child) => {
                          const childActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                                childActive
                                  ? 'bg-brand-50 font-medium text-brand'
                                  : 'text-neutral-600 hover:bg-neutral-100'
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-0' : 'px-3'
                  } ${active ? 'bg-brand-50 text-brand' : 'text-neutral-600 hover:bg-neutral-100'}`}
                >
                  {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
                  {!collapsed ? item.label : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
