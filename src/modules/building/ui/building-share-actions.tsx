'use client';

import { Check, Link2, Share2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { Building } from '@/modules/building/model/building-types';
import { useBuildingShare } from '@/modules/building/model/use-building-share';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

export function BuildingShareActions({ building }: { building: Building }) {
  const t = useTranslations('buildings.share');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { link, share, sharing, canShare, copy, copying, status, fallbackOpen, dismissFallback } =
    useBuildingShare(building, locale);
  const copied = status === 'copied';
  const PrimaryIcon = canShare ? Share2 : copied ? Check : Link2;
  const copyLabel = copied ? t('copied') : t('copyLink');
  const primaryLabel = canShare ? t('action') : copyLabel;

  return (
    <div className="building-share-actions">
      <button
        type="button"
        className="building-gallery-control"
        onClick={canShare ? share : copy}
        disabled={sharing || copying}
        aria-busy={sharing || copying || undefined}
        aria-label={primaryLabel}
        title={primaryLabel}
        data-copied={(!canShare && copied) || undefined}
      >
        {sharing || copying ? <ProgressRing size="sm" /> : <PrimaryIcon aria-hidden="true" />}
      </button>
      {canShare ? (
        <button
          type="button"
          className="building-gallery-control"
          onClick={copy}
          disabled={copying}
          aria-label={copyLabel}
          title={copyLabel}
          aria-busy={copying || undefined}
          data-copied={copied || undefined}
        >
          {copying ? (
            <ProgressRing size="sm" />
          ) : copied ? (
            <Check aria-hidden="true" />
          ) : (
            <Link2 aria-hidden="true" />
          )}
        </button>
      ) : null}
      <span role="status" className="sr-only" aria-live="polite">
        {copied ? t('copied') : ''}
      </span>
      {fallbackOpen ? (
        <div className="building-share-fallback">
          <button
            type="button"
            className="building-share-fallback__close"
            onClick={dismissFallback}
            aria-label={commonT('actions.close')}
          >
            <X aria-hidden="true" />
          </button>
          <p role="status">{commonT('actions.copyHelp')}</p>
          <label>
            <span className="sr-only">{t('copyLink')}</span>
            <input readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <button type="button" onClick={copy} disabled={copying}>
            {t('copyLink')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
