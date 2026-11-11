'use client';

import { Download, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { Building } from '@/modules/building/model/building-types';
import { useBuildingCardShare } from '@/modules/building/model/use-building-card-share';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

export function BuildingCardActions({ building }: { building: Building }) {
  const locale = useLocale();
  const t = useTranslations('buildings.share');
  const { url, filename, ready, preparing, share, sharing, failed } = useBuildingCardShare(
    building,
    locale,
  );
  return (
    <div className="building-card-actions">
      {preparing || ready ? (
        <button
          type="button"
          className="building-gallery-download"
          onClick={share}
          disabled={preparing || sharing}
          aria-busy={preparing || sharing || undefined}
        >
          {preparing || sharing ? <ProgressRing size="sm" /> : <Share2 aria-hidden="true" />}
          <span>{t('shareCard')}</span>
        </button>
      ) : null}
      <a className="building-gallery-download" href={url} download={filename}>
        <Download aria-hidden="true" />
        <span>{t('saveCard')}</span>
      </a>
      <span role="status" aria-live="polite" className={failed ? undefined : 'sr-only'}>
        {failed ? t('cardUnavailable') : ''}
      </span>
    </div>
  );
}
