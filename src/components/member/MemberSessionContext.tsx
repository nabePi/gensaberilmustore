'use client';

import type { Role } from '@prisma/client';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type MemberSessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  avatarUrl: string | null;
};

const MemberSessionContext = createContext<MemberSessionUser | null>(null);

export function MemberSessionProvider({
  user,
  children,
}: {
  user: MemberSessionUser;
  children: ReactNode;
}) {
  return <MemberSessionContext.Provider value={user}>{children}</MemberSessionContext.Provider>;
}

export function useMemberSession(): MemberSessionUser {
  const user = useContext(MemberSessionContext);
  if (!user) {
    throw new Error('useMemberSession must be used within MemberSessionProvider');
  }
  return user;
}
