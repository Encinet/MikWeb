'use client';

import { useEffect } from 'react';
import { isStaffRole } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { announceHistoryChange, syncHistoryAccount } from '@/modules/chat/lib/chat-history';
import { syncChatNotificationAccount } from '@/modules/chat/lib/chat-notifications';

/** Clear account-scoped history and notification previews, including outside the chat page. */
export function ChatAccountGuard() {
  const { account, verified, isLoading } = useAuth();
  const owner = account?.playerUuid ?? null;
  const staff = isStaffRole(account?.role);
  useEffect(() => {
    if (!verified || isLoading) return;
    let current = true;
    void syncChatNotificationAccount(owner, staff, () => current).catch(() => undefined);
    void syncHistoryAccount(owner, () => current)
      .then(() => {
        if (current) announceHistoryChange();
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [owner, staff, verified, isLoading]);
  return null;
}
