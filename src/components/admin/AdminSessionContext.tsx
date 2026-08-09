'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type AdminSessionUser = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

const AdminSessionContext = createContext<AdminSessionUser | null>(null);

export function AdminSessionProvider({
  user,
  children,
}: {
  user: AdminSessionUser;
  children: ReactNode;
}) {
  return <AdminSessionContext.Provider value={user}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionUser {
  const user = useContext(AdminSessionContext);
  if (!user) {
    throw new Error('useAdminSession must be used within AdminSessionProvider');
  }
  return user;
}
