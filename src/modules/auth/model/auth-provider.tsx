'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { isAuthMeResponse } from '@/modules/auth/model/auth-types';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';
import {
  announceAccountChange,
  onOtherTabAccountChange,
} from '@/shared/lib/account-browser-events';

interface AuthProviderProps {
  children: ReactNode;
  initialSessionPresent: boolean;
}

export function AuthProvider({ children, initialSessionPresent }: AuthProviderProps) {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isLoading, setIsLoading] = useState(initialSessionPresent);
  const [verified, setVerified] = useState(!initialSessionPresent);
  const verifiedAccount = useRef<string | null | undefined>(
    initialSessionPresent ? undefined : null,
  );
  const verificationGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++verificationGeneration.current;
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (generation !== verificationGeneration.current) return null;
      if (!response.ok) throw new Error('Account verification unavailable');
      const payload: unknown = await response.json();
      if (generation !== verificationGeneration.current) return null;
      if (!isAuthMeResponse(payload)) throw new Error('Invalid account verification response');
      const nextAccount = payload.authenticated ? payload.account : null;
      const previous = verifiedAccount.current;
      verifiedAccount.current = nextAccount?.playerUuid ?? null;
      setVerified(true);
      // A verified refresh can follow a new session for the same player.
      clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
      setAccount(nextAccount);
      if (previous !== undefined && previous !== verifiedAccount.current) announceAccountChange();
      return nextAccount;
    } finally {
      if (generation === verificationGeneration.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const acceptAuthentication = useCallback((nextAccount: AuthAccount) => {
    verificationGeneration.current++;
    verifiedAccount.current = nextAccount.playerUuid;
    clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
    setAccount(nextAccount);
    setVerified(true);
    setIsLoading(false);
    announceAccountChange();
  }, []);

  const logout = useCallback(async (options: { allSessions?: boolean } = {}) => {
    const all = options.allSessions === true;
    const response = await fetch(all ? '/api/account/sessions/revoke' : '/api/auth/logout', {
      method: 'POST',
      headers: all ? { 'Content-Type': 'application/json' } : undefined,
      body: all ? JSON.stringify({ all: true }) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'logout_failed');
    }
    verificationGeneration.current++;
    clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
    setAccount(null);
    verifiedAccount.current = null;
    setVerified(true);
    setIsLoading(false);
    announceAccountChange();
  }, []);

  useEffect(() => {
    if (initialSessionPresent) {
      void refresh().catch(() => undefined);
    } else {
      verificationGeneration.current++;
      clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
      setAccount(null);
      verifiedAccount.current = null;
      setVerified(true);
      setIsLoading(false);
    }

    return () => {
      verificationGeneration.current++;
    };
  }, [initialSessionPresent, refresh]);

  useEffect(
    () =>
      onOtherTabAccountChange(() => {
        verifiedAccount.current = undefined;
        setVerified(false);
        setAccount(null);
        clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
        void refresh().catch(() => undefined);
      }),
    [refresh],
  );

  const value = useMemo(
    () => ({
      account,
      authenticated: account !== null,
      isLoading,
      verified,
      logout,
      refresh,
      acceptAuthentication,
    }),
    [account, isLoading, logout, refresh, verified, acceptAuthentication],
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}
