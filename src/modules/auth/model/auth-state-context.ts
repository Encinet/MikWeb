'use client';

import { createContext } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';

export interface AuthState {
  account: AuthAccount | null;
  authenticated: boolean;
  /** Includes background refreshes. Previously verified identity remains usable while refreshing. */
  isLoading: boolean;
  /** Only a server response or completed authentication can verify identity; display hints cannot. */
  verified: boolean;
  refresh: () => Promise<AuthAccount | null>;
  acceptAuthentication: (account: AuthAccount) => void;
  logout: (options?: { allSessions?: boolean }) => Promise<void>;
}

export const AuthStateContext = createContext<AuthState | null>(null);
