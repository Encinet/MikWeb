'use client';

import { Download, ImageUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  getBuildingImagePath,
  getBuildingShareData,
  getBuildingSocialImagePath,
} from '@/modules/building/lib/building-links';
import type { Building } from '@/modules/building/model/building-types';
import { useBuildingImageShare } from '@/modules/building/model/use-building-image-share';

export function BuildingImageActions({
  building,
  image,
  imageIndex,
}: {
  building: Building;
  image: string | undefined;
  imageIndex: number;
}) {
  const locale = useLocale();
  const t = useTranslations('buildings.share');
  const { ready, share, sharing, failed } = useBuildingImageShare(
    image ? getBuildingImagePath(building.id, imageIndex) : undefined,
    `${building.id}-${imageIndex + 1}`,
    getBuildingShareData(building, locale),
  );
  return (
    <div className="building-image-actions">
      <a
        className="building-gallery-download"
        href={getBuildingSocialImagePath(building.id, locale)}
        download={`${building.id}.png`}
      >
        <Download aria-hidden="true" />
        <span>{t('saveCard')}</span>
      </a>
      {ready ? (
        <button
          type="button"
          className="building-gallery-download"
          onClick={share}
          disabled={sharing}
          aria-busy={sharing || undefined}
        >
          <ImageUp aria-hidden="true" />
          <span>{t('shareImage')}</span>
        </button>
      ) : null}
      <span role="status" aria-live="polite">
        {failed ? t('imageUnavailable') : ''}
      </span>
    </div>
  );
}
