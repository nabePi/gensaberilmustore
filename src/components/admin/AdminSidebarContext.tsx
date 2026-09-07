'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type AdminSidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const AdminSidebarContext = createContext<AdminSidebarContextValue | null>(null);

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminSidebarContext.Provider
      value={{ collapsed, toggleCollapsed: () => setCollapsed((prev) => !prev) }}
    >
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const ctx = useContext(AdminSidebarContext);
  if (!ctx) {
    throw new Error('useAdminSidebar must be used within an AdminSidebarProvider');
  }
  return ctx;
}
