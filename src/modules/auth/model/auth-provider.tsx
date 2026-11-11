'use client';

import type { ReactNode } from 'react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { isAuthMeResponse } from '@/modules/auth/model/auth-types';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';
import {
  announceAccountChange,
  onOtherTabAccountChange,
} from '@/shared/lib/account-browser-events';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const verifiedAccount = useRef<string | null | undefined>(undefined);
  const verificationGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++verificationGeneration.current;
    setIsLoading(true);
    try {
      const payload = await withRequestTimeout(10_000, async (signal) => {
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          cache: 'no-store',
          signal,
        });
        if (!response.ok) throw new Error('Account verification unavailable');
        return (await response.json()) as unknown;
      });
      if (generation !== verificationGeneration.current) return null;
      if (!isAuthMeResponse(payload)) throw new Error('Invalid account verification response');
      const nextAccount = payload.authenticated ? payload.account : null;
      const previous = verifiedAccount.current;
      verifiedAccount.current = nextAccount?.playerUuid ?? null;
      startTransition(() => {
        setVerified(true);
        setAccount(nextAccount);
      });
      // A verified refresh can follow a new session for the same player.
      clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
      if (previous !== undefined && previous !== verifiedAccount.current) announceAccountChange();
      return nextAccount;
    } finally {
      if (generation === verificationGeneration.current) {
        startTransition(() => setIsLoading(false));
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
    await withRequestTimeout(10_000, async (signal) => {
      const response = await fetch(all ? '/api/account/sessions/revoke' : '/api/auth/logout', {
        method: 'POST',
        headers: all ? { 'Content-Type': 'application/json' } : undefined,
        body: all ? JSON.stringify({ all: true }) : undefined,
        cache: 'no-store',
        signal,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'logout_failed');
      }
    });
    verificationGeneration.current++;
    clearFetchValidatedJsonBrowserCache({ prefix: 'account:' });
    setAccount(null);
    verifiedAccount.current = null;
    setVerified(true);
    setIsLoading(false);
    announceAccountChange();
  }, []);

  useEffect(() => {
    // Session cookies remain HttpOnly. Resolve identity after hydration so public HTML is shared.
    void refresh().catch(() => undefined);

    return () => {
      verificationGeneration.current++;
    };
  }, [refresh]);

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

  return <AuthStateContext value={value}>{children}</AuthStateContext>;
}
