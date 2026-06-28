'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import type { AuthAccount, AuthMeResponse } from '@/modules/auth/model/auth-types';
import { isAuthAccount } from '@/modules/auth/model/auth-types';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';

interface AuthProviderProps {
  children: ReactNode;
  initialSessionPresent: boolean;
}

const AUTH_ACCOUNT_SNAPSHOT_KEY = 'mikweb:auth-account:v1';

export function AuthProvider({ children, initialSessionPresent }: AuthProviderProps) {
  const initialAccount = useMemo(
    () => (initialSessionPresent ? readStoredAuthAccount() : null),
    [initialSessionPresent],
  );
  const [account, setAccount] = useState<AuthAccount | null>(initialAccount);
  const [isLoading, setIsLoading] = useState(initialSessionPresent && !initialAccount);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoading(true);
    }
    try {
      const response = await fetch('/api/auth/me', {
        method: 'POST',
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as AuthMeResponse | null;
      const nextAccount = response.ok && payload?.authenticated ? (payload.account ?? null) : null;
      if (!nextAccount) {
        removeStoredAuthAccount();
        clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
      } else {
        writeStoredAuthAccount(nextAccount);
      }
      setAccount(nextAccount);
    } finally {
      if (!options.silent) {
        setIsLoading(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      cache: 'no-store',
    });
    removeStoredAuthAccount();
    clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
    setAccount(null);
  }, []);

  useEffect(() => {
    if (initialSessionPresent) {
      void refresh({ silent: Boolean(initialAccount) });
      return;
    }
    removeStoredAuthAccount();
    clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
  }, [initialAccount, initialSessionPresent, refresh]);

  const value = useMemo(
    () => ({
      account,
      authenticated: account !== null,
      isLoading,
      logout,
      refresh,
    }),
    [account, isLoading, logout, refresh],
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}

function readStoredAuthAccount(): AuthAccount | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_ACCOUNT_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isAuthAccount(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore broken snapshots and fall back to server verification.
  }

  removeStoredAuthAccount();
  return null;
}

function writeStoredAuthAccount(account: AuthAccount) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_ACCOUNT_SNAPSHOT_KEY, JSON.stringify(account));
  } catch {
    // The snapshot is an optimization only.
  }
}

function removeStoredAuthAccount() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_ACCOUNT_SNAPSHOT_KEY);
  } catch {
    // The snapshot is an optimization only.
  }
}
