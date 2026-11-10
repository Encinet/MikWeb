'use client';

import { ArrowLeft, Building2, RotateCcw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { BuildingGalleryFrame } from '@/modules/building/ui/building-gallery-frame';
import { BuildingsLoadingState } from '@/modules/building/ui/buildings-status-states';
import { Link, useRouter } from '@/shared/i18n/navigation';

export function BuildingRouteState({
  onRetry,
  titleId,
}: {
  onRetry?: () => void;
  titleId?: string;
}) {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  return (
    <section className="building-route-state page-shell page-shell-stable">
      <Building2 aria-hidden="true" />
      <h1 id={titleId}>{onRetry ? commonT('states.error') : t('states.notFound')}</h1>
      <p>{onRetry ? t('states.loadFailed') : t('states.notFoundDescription')}</p>
      <div>
        <Link href="/buildings">
          <ArrowLeft aria-hidden="true" />
          {t('title')}
        </Link>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            <RotateCcw aria-hidden="true" />
            {commonT('actions.retry')}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function BuildingGalleryError({ onRetry }: { onRetry?: () => void }) {
  const titleId = useId();
  const router = useRouter();
  const t = useTranslations('buildings');
  const onClose = () => router.back();
  return (
    <BuildingGalleryFrame modal onClose={onClose} titleId={titleId}>
      <div className="building-gallery-toolbar">
        <span />
        <button
          type="button"
          className="building-gallery-control"
          onClick={onClose}
          data-dialog-close
          aria-label={t('dialog.close')}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <BuildingRouteState onRetry={onRetry} titleId={titleId} />
    </BuildingGalleryFrame>
  );
}

export function BuildingGalleryLoading() {
  const titleId = useId();
  const router = useRouter();
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const onClose = () => router.back();
  return (
    <BuildingGalleryFrame modal onClose={onClose} titleId={titleId}>
      <div className="building-gallery-toolbar">
        <span id={titleId}>{t('title')}</span>
        <button
          type="button"
          className="building-gallery-control"
          onClick={onClose}
          data-dialog-close
          aria-label={t('dialog.close')}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <BuildingsLoadingState message={commonT('states.loading')} />
    </BuildingGalleryFrame>
  );
}
