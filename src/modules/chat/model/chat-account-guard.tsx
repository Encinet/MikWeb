'use client';

import { useEffect } from 'react';
import { isStaffRole } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { hasStoredChatHistory } from '@/modules/chat/lib/chat-history-presence';

/** Clear account-scoped history and notification previews, including outside the chat page. */
export function ChatAccountGuard() {
  const { account, verified, isLoading } = useAuth();
  const owner = account?.playerUuid ?? null;
  const staff = isStaffRole(account?.role);
  useEffect(() => {
    if (!verified || isLoading) return;
    let current = true;
    void import('@/modules/chat/lib/chat-notifications')
      .then(({ syncChatNotificationAccount }) => {
        if (current) return syncChatNotificationAccount(owner, staff, () => current);
      })
      .catch(() => undefined);
    void hasStoredChatHistory()
      .then((exists) => (current && exists ? import('@/modules/chat/lib/chat-history') : null))
      .then(async (history) => {
        if (!current || !history) return;
        await history.syncHistoryAccount(owner, () => current);
        if (current) history.announceHistoryChange();
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [owner, staff, verified, isLoading]);
  return null;
}
