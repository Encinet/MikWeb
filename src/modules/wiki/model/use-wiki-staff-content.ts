'use client';

import { useEffect, useState } from 'react';
import { authRequest } from '@/modules/auth/lib/auth-request';
import { isStaffRole } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { WikiContentBundle } from '@/modules/wiki/model/wiki-section-types';

export function useWikiStaffContent(locale: string) {
  const { account, verified, isLoading: authLoading } = useAuth();
  const owner = verified && !authLoading && isStaffRole(account?.role) ? account?.playerUuid : null;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    owner: string;
    locale: string;
    attempt: number;
    bundle?: WikiContentBundle;
    failed?: boolean;
  } | null>(null);

  useEffect(() => {
    setResult(null);
    if (!owner) return;
    const controller = new AbortController();
    let current = true;
    void authRequest<WikiContentBundle>(`/api/wiki/staff?locale=${encodeURIComponent(locale)}`, {
      signal: controller.signal,
    })
      .then((bundle) => {
        if (current) setResult({ owner, locale, attempt, bundle });
      })
      .catch(() => {
        if (current) setResult({ owner, locale, attempt, failed: true });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [locale, owner, attempt]);

  // Drop private results synchronously on logout, role changes, and account switches.
  const active =
    owner && result?.owner === owner && result.locale === locale && result.attempt === attempt
      ? result
      : null;
  return {
    bundle: active?.bundle,
    loading: Boolean(owner && !active),
    failed: active?.failed === true,
    retry: () => setAttempt((value) => value + 1),
  };
}
