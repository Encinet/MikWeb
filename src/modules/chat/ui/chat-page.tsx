'use client';

import { RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useAuth } from '@/modules/auth/model/use-auth';
import { ChatGate } from '@/modules/chat/ui/chat-gate';
import { ChatWorkspace } from '@/modules/chat/ui/chat-workspace';
import { Link } from '@/shared/i18n/navigation';

export function ChatPage({ appearance }: { appearance: ReactNode }) {
  const { account, isLoading, verified, refresh } = useAuth();
  const t = useTranslations('chat');
  const commonT = useTranslations('common');
  if (account && verified)
    return <ChatWorkspace key={account.playerUuid} account={account} appearance={appearance} />;
  return (
    <ChatGate
      state={isLoading ? 'pending' : verified ? 'signed-out' : 'error'}
      message={
        isLoading
          ? t('status.authorizing')
          : verified
            ? undefined
            : t('errors.auth_upstream_unavailable')
      }
    >
      {!isLoading ? (
        verified ? (
          <Link href="/login" className="chat-primary">
            {commonT('actions.login')}
          </Link>
        ) : (
          <button
            type="button"
            className="chat-primary"
            onClick={() => void refresh().catch(() => undefined)}
          >
            <RotateCw size={15} aria-hidden="true" />
            {commonT('actions.retry')}
          </button>
        )
      ) : null}
    </ChatGate>
  );
}
