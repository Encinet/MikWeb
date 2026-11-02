'use client';

import { createContext } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';

export interface AuthState {
  account: AuthAccount | null;
  authenticated: boolean;
  isLoading: boolean;
  verified: boolean;
  refresh: () => Promise<AuthAccount | null>;
  acceptAuthentication: (account: AuthAccount) => void;
  logout: (options?: { allSessions?: boolean }) => Promise<void>;
}

export const AuthStateContext = createContext<AuthState | null>(null);
