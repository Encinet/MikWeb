'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { loadJoinCaptcha } from '@/modules/join/lib/load-join-captcha';
import type { JoinCaptchaConfig } from '@/modules/join/model/join-captcha';
import { isCapToken } from '@/modules/join/model/join-captcha';
import { isRecord } from '@/shared/lib/is-record';

export function JoinCaptcha({
  config,
  onVerified,
  onError,
  onCancel,
}: {
  config: JoinCaptchaConfig;
  onVerified: (token: string) => void;
  onError: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('join.captcha');
  const locale = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const verified = useEffectEvent(onVerified);
  const failed = useEffectEvent(onError);
  const label = t('verify');
  const errorLabel = t('failed');

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const lifetime = new AbortController();
    const { signal } = lifetime;
    const stop = () => {
      lifetime.abort();
      window.clearTimeout(timer);
    };
    const error = () => {
      if (signal.aborted) return;
      stop();
      failed();
    };
    const timer = window.setTimeout(error, 12_000);
    void loadJoinCaptcha(config.apiEndpoint)
      .then(() => {
        if (signal.aborted || host.current !== container) return;
        window.clearTimeout(timer);
        const widget: HTMLElement = document.createElement('cap-widget');
        widget.setAttribute('data-cap-api-endpoint', config.apiEndpoint);
        widget.setAttribute('data-cap-lang', locale.toLowerCase());
        widget.setAttribute('data-cap-i18n-initial-state', label);
        widget.setAttribute('data-cap-i18n-error-label', errorLabel);
        widget.addEventListener(
          'solve',
          (event) => {
            const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
            if (isRecord(detail) && isCapToken(detail.token)) verified(detail.token);
          },
          { signal },
        );
        widget.addEventListener('error', error, { signal });
        container.append(widget);
        setLoaded(true);
      })
      .catch(error);
    return () => {
      stop();
      container.replaceChildren();
    };
  }, [config.apiEndpoint, locale, label, errorLabel]);

  return (
    <div className="join-captcha">
      <div ref={host} className="join-captcha-widget" />
      {!loaded ? (
        <p className="join-captcha-loading" role="status">
          {t('loading')}
        </p>
      ) : null}
      <button type="button" className="ui-action-button join-captcha-cancel" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}
