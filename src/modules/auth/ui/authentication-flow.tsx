'use client';

import { ArrowRight, Check, Copy, Gamepad2, KeyRound, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import type { AuthenticationFlow } from '@/modules/auth/model/use-authentication-flow';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { useCopyFeedback } from '@/shared/hooks/use-copy-feedback';
import { InlineFeedback } from '@/shared/ui/feedback/async-state';

type AuthenticationMethod = 'minecraft' | 'passkey';

export function AuthenticationIdentity({ account }: { account: AuthAccount }) {
  return (
    <div className="auth-flow-identity">
      <MinecraftAvatar
        uuid={account.playerUuid}
        name={account.currentName}
        size={48}
        className="auth-flow-identity__avatar"
      />
      <strong>{account.currentName}</strong>
    </div>
  );
}

export function AuthenticationMethods({
  flow,
  methods = ['minecraft', 'passkey'],
}: {
  flow: AuthenticationFlow;
  methods?: AuthenticationMethod[];
}) {
  const t = useTranslations('auth.authentication');
  return (
    <fieldset className="auth-flow-methods" disabled={flow.busy}>
      <legend className="sr-only">{t('methods')}</legend>
      {methods.map((type) => {
        const Icon = type === 'minecraft' ? Gamepad2 : KeyRound;
        const action = type === 'minecraft' ? flow.startGame : flow.startPasskey;
        return (
          <button
            key={type}
            type="button"
            className="auth-flow-method"
            onClick={() => void action()}
            aria-busy={(type === 'minecraft' && flow.phase === 'creating') || undefined}
          >
            <span className="auth-flow-method__icon" aria-hidden="true">
              {type === 'minecraft' && flow.phase === 'creating' ? (
                <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </span>
            <span className="auth-flow-method__copy">
              <strong>
                {t(
                  type === 'minecraft' && flow.phase === 'creating' ? 'creating' : `${type}.title`,
                )}
              </strong>
              <span>{t(`${type}.description`)}</span>
            </span>
            <ArrowRight className="auth-flow-method__arrow h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </fieldset>
  );
}

export function AuthenticationProgress({
  title,
  heading: Heading = 'h2',
  onCancel,
}: {
  title: string;
  heading?: 'h1' | 'h2';
  onCancel?: () => void;
}) {
  const t = useTranslations('auth.authentication');
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="auth-flow-progress" role="status" aria-live="polite" aria-atomic="true">
      <span className="auth-flow-progress__mark" aria-hidden="true">
        <Loader2 className="h-8 w-8 motion-safe:animate-spin" />
      </span>
      <Heading ref={ref} tabIndex={-1}>
        {title}
      </Heading>
      {onCancel ? (
        <button className="auth-flow-other-method" type="button" onClick={onCancel}>
          {t('otherMethod')}
        </button>
      ) : null}
    </section>
  );
}

export function AuthenticationFeedback({
  error,
  className,
}: {
  error: string | null;
  className?: string;
}) {
  const t = useTranslations('auth.authentication.errors');
  const key = error && t.has(error) ? error : 'request_failed';
  return (
    <InlineFeedback
      className={className}
      value={error ? { message: t(key), kind: error === 'cancelled' ? 'info' : 'error' } : null}
    />
  );
}

export function AuthenticationCode({ flow }: { flow: AuthenticationFlow }) {
  const t = useTranslations('auth.authentication.codePanel');
  const id = useId();
  const challenge = flow.challenge;
  const { status, copying, copy } = useCopyFeedback(
    challenge ? `/weblogin ${challenge.displayCode}` : '',
  );
  if (!challenge) return null;
  const time = `${Math.floor(flow.remainingSeconds / 60)}:${(flow.remainingSeconds % 60).toString().padStart(2, '0')}`;
  return (
    <>
      <p className="auth-code-description">{t('instructions')}</p>
      <button
        type="button"
        className="auth-code-value"
        aria-label={t('copyLabel')}
        aria-describedby={id}
        aria-busy={copying || undefined}
        disabled={copying}
        onClick={() => void copy()}
      >
        <span className="auth-code-command">/weblogin</span>{' '}
        <span className="auth-code-number">{challenge.displayCode}</span>
        {status === 'copied' ? (
          <Check className="auth-code-copy h-5 w-5" aria-hidden="true" />
        ) : (
          <Copy className="auth-code-copy h-5 w-5" aria-hidden="true" />
        )}
      </button>
      {flow.error ? (
        <AuthenticationFeedback error={flow.error} className="auth-code-feedback" />
      ) : (
        <div className="auth-code-status" role="status">
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          <span>{t('waiting')}</span>
        </div>
      )}
      <div className="auth-code-footer">
        <span id={id} role="status" aria-live="polite" aria-atomic="true">
          {t(status === 'copied' ? 'copied' : status === 'error' ? 'copyFailed' : 'copyHint')}
        </span>
        <time dateTime={challenge.expiresAt}>{t('remaining', { time })}</time>
      </div>
    </>
  );
}
