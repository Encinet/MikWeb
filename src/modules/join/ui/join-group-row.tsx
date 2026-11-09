'use client';

import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { JoinCaptchaConfig } from '@/modules/join/model/join-captcha';
import type { JoinGroup } from '@/modules/join/model/join-group';
import { useJoinCode } from '@/modules/join/model/use-join-code';
import { JoinCaptcha } from '@/modules/join/ui/join-captcha';
import { CopyButton } from '@/shared/ui/action/copy-button';

export function JoinGroupRow({
  group,
  captcha,
}: {
  group: JoinGroup;
  captcha: JoinCaptchaConfig | null;
}) {
  const t = useTranslations('join');
  const commonT = useTranslations('common');
  const { state, remaining, request, verify, cancelVerification, failVerification, markCopied } =
    useJoinCode(group.id, captcha);
  const captchaArea = useRef<HTMLDivElement>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  const requestButton = useRef<HTMLButtonElement>(null);
  const focusOnReady = useRef(false);
  const setRequestButton = useCallback((node: HTMLButtonElement | null) => {
    if (
      node === null &&
      (document.activeElement === requestButton.current ||
        captchaArea.current?.contains(document.activeElement))
    )
      focusOnReady.current = true;
    requestButton.current = node;
  }, []);
  const setCaptchaArea = useCallback((node: HTMLDivElement | null) => {
    if (node === null && captchaArea.current?.contains(document.activeElement))
      focusOnReady.current = true;
    captchaArea.current = node;
  }, []);
  const busy = state.phase === 'loading' || state.phase === 'verifying';
  const copied = state.phase === 'ready' && state.copied;

  useLayoutEffect(() => {
    if (state.phase !== 'ready') {
      if (focusOnReady.current) requestButton.current?.focus({ preventScroll: true });
      focusOnReady.current = false;
      return;
    }
    const copy = copyButton.current;
    let focused = false;
    const onFocus = () => {
      focused = true;
    };
    const onBlur = () => {
      focused = false;
    };
    copy?.addEventListener('focus', onFocus);
    copy?.addEventListener('blur', onBlur);
    if (focusOnReady.current) copy?.focus({ preventScroll: true });
    focusOnReady.current = false;
    return () => {
      copy?.removeEventListener('focus', onFocus);
      copy?.removeEventListener('blur', onBlur);
      if (focused) queueMicrotask(() => requestButton.current?.focus({ preventScroll: true }));
    };
  }, [state.phase]);

  const message =
    state.phase === 'error'
      ? t(`errors.${state.error}`)
      : state.phase === 'expired'
        ? t('code.expired')
        : state.phase === 'verifying'
          ? t('captcha.hint')
          : state.phase === 'loading'
            ? t('code.waitingHint')
            : state.phase === 'ready'
              ? t(copied ? 'code.paste' : 'code.help')
              : '';

  return (
    <article className="join-group" aria-labelledby={`join-group-${group.id}`}>
      <h3 className="join-group-title" id={`join-group-${group.id}`}>
        {t(`groups.${group.id}`)}
      </h3>
      {group.number ? (
        <p className="join-group-number">{t('qq.number', { number: group.number })}</p>
      ) : null}
      <div className="join-group-actions">
        {state.phase === 'ready' ? (
          <CopyButton
            ref={copyButton}
            value={state.value.code}
            label={t('code.copy')}
            showLabel
            onCopied={() => markCopied(state.value.code)}
            className={`ui-action-button${copied ? '' : ' ui-action-button--primary'}`}
          />
        ) : (
          <button
            ref={setRequestButton}
            type="button"
            className="ui-action-button ui-action-button--primary"
            disabled={busy}
            aria-busy={busy || undefined}
            aria-describedby={`join-message-${group.id}`}
            onClick={() => {
              focusOnReady.current = false;
              request();
            }}
          >
            {state.phase === 'loading'
              ? commonT('states.loading')
              : state.phase === 'verifying'
                ? t('captcha.pending')
                : state.phase === 'expired' || state.phase === 'error'
                  ? t('code.retry')
                  : t('code.get')}
          </button>
        )}
        <a
          className={`ui-action-button${copied ? ' ui-action-button--primary' : ''}`}
          href={group.joinUrl}
          target="_blank"
          rel="noopener noreferrer external"
        >
          {t('qq.open')}
          <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
      {(state.phase === 'verifying' || state.phase === 'loading') && captcha ? (
        <div ref={setCaptchaArea}>
          <JoinCaptcha
            config={captcha}
            onVerified={(token) => void verify(token)}
            onError={failVerification}
            onCancel={() => {
              cancelVerification();
              queueMicrotask(() => requestButton.current?.focus({ preventScroll: true }));
            }}
          />
        </div>
      ) : null}
      {state.phase === 'ready' ? (
        <section className="join-code" aria-label={t('code.label')}>
          <span className="join-code-label">{t('code.label')}</span>
          <output
            className="join-code-value"
            translate="no"
          >{`${state.value.code.slice(0, 3)} ${state.value.code.slice(3)}`}</output>
          <div className="join-code-timer">
            <span>{t('code.remaining', { seconds: Math.ceil(remaining / 1000) })}</span>
            <progress
              max={state.value.period * 1000}
              value={remaining}
              aria-label={t('code.remainingLabel')}
            />
          </div>
        </section>
      ) : null}
      <p
        className="inline-feedback join-message"
        id={`join-message-${group.id}`}
        role="status"
        aria-atomic="true"
      >
        {message}
      </p>
    </article>
  );
}
