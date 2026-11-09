'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { loadJoinCaptcha } from '@/modules/join/lib/load-join-captcha';
import type { JoinCaptchaConfig } from '@/modules/join/model/join-captcha';
import { isCapToken } from '@/modules/join/model/join-captcha';

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
    let active = true;
    const widget = document.createElement('cap-widget');
    widget.setAttribute('data-cap-api-endpoint', config.apiEndpoint);
    widget.setAttribute('data-cap-lang', locale.toLowerCase());
    widget.setAttribute('data-cap-i18n-initial-state', label);
    widget.setAttribute('data-cap-i18n-error-label', errorLabel);
    const solve = (event: Event) => {
      const detail: unknown = (event as CustomEvent<unknown>).detail;
      if (
        active &&
        detail &&
        typeof detail === 'object' &&
        'token' in detail &&
        isCapToken(detail.token)
      )
        verified(detail.token);
    };
    const error = () => {
      if (active) failed();
    };
    widget.addEventListener('solve', solve);
    widget.addEventListener('error', error);
    const timer = window.setTimeout(error, 12_000);
    void loadJoinCaptcha().then(() => {
      if (!active) return;
      window.clearTimeout(timer);
      host.current?.append(widget);
      setLoaded(true);
    }, error);
    return () => {
      active = false;
      window.clearTimeout(timer);
      widget.removeEventListener('solve', solve);
      widget.removeEventListener('error', error);
      widget.remove();
    };
  }, [config.apiEndpoint, locale, label, errorLabel]);

  return (
    <div className="join-captcha">
      <div ref={host} />
      {!loaded ? <p role="status">{t('loading')}</p> : null}
      <button type="button" className="ui-action-button" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}
