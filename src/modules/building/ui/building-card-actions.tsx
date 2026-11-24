'use client';

import { Download, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LocalizedBuilding } from '@/modules/building/model/building-types';
import { useBuildingCardShare } from '@/modules/building/model/use-building-card-share';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

export function BuildingCardActions({ building }: { building: LocalizedBuilding }) {
  const locale = useLocale();
  const t = useTranslations('buildings.share');
  const { url, filename, supported, ready, busy, prepareOrShare, failed } = useBuildingCardShare(
    building,
    locale,
  );
  return (
    <div className="building-card-actions">
      {supported ? (
        <button
          type="button"
          className="building-gallery-download"
          onClick={prepareOrShare}
          disabled={busy !== null}
          aria-busy={busy !== null || undefined}
        >
          {busy ? <ProgressRing size="sm" /> : <Share2 aria-hidden="true" />}
          <span>
            {busy === 'preparing' ? t('preparingCard') : ready ? t('shareCard') : t('prepareCard')}
          </span>
        </button>
      ) : null}
      <a className="building-gallery-download" href={url} download={filename}>
        <Download aria-hidden="true" />
        <span>{t('saveCard')}</span>
      </a>
      <span role="status" aria-live="polite" className={failed ? undefined : 'sr-only'}>
        {failed ? t('cardUnavailable') : ready ? t('cardReady') : ''}
      </span>
    </div>
  );
}
