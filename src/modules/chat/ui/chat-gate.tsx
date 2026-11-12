'use client';

import { MessageCircle, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SITE_LOGO_PATH, SITE_SHORT_NAME } from '@/shared/config/site-config';
import { Link } from '@/shared/i18n/navigation';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

interface ChatGateProps {
  state: 'pending' | 'error' | 'signed-out';
  message?: string;
  children?: ReactNode;
}

export function ChatGate({ state, message, children }: ChatGateProps) {
  const t = useTranslations('chat');
  const pending = state === 'pending';
  const Icon = state === 'error' ? ShieldAlert : MessageCircle;

  return (
    <section className="chat-workspace chat-gate" aria-label={t('title')}>
      <Link href="/" className="chat-back" aria-label={t('backHome')}>
        <Image src={SITE_LOGO_PATH} alt="" width={32} height={32} />
        <span>{SITE_SHORT_NAME}</span>
      </Link>
      <div className="chat-gate__content">
        {pending ? <ProgressRing size="lg" /> : <Icon size={28} aria-hidden="true" />}
        <h1>{t('title')}</h1>
        {message ? <p role={state === 'error' ? 'alert' : 'status'}>{message}</p> : null}
        {children}
      </div>
    </section>
  );
}
