'use client';

import { createContext } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';

export interface AuthState {
  account: AuthAccount | null;
  authenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthStateContext = createContext<AuthState | null>(null);
