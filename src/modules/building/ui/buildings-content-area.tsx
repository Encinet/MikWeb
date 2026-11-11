'use client';

import type { useTranslations } from 'next-intl';
import InfiniteScroll from 'react-infinite-scroll-component';
import { getBuildingPath } from '@/modules/building/lib/building-links';
import { getBuildingName } from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import { sortBuildersByWeight } from '@/modules/building/model/building-types';
import { BuildingCard } from '@/modules/building/ui/building-card';
import { BuildingPreviewImage } from '@/modules/building/ui/building-preview-image';
import {
  BuildingsLoadingState,
  BuildingsStatusMessage,
} from '@/modules/building/ui/buildings-status-states';
import { Link } from '@/shared/i18n/navigation';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

type BuildingsTranslator = ReturnType<typeof useTranslations<'buildings'>>;

interface BuildingsContentAreaProps {
  buildings: Building[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  retryLabel: string;
  errorMessage: string;
  filteredBuildings: Building[];
  loadMore: () => void;
  locale: string;
  t: BuildingsTranslator;
  loadingMessage: string;
  errorTitle: string;
  emptyMessage: string;
  endMessage: string;
}

export function BuildingsContentArea({
  buildings,
  hasMore,
  isLoading,
  error,
  onRetry,
  retryLabel,
  errorMessage,
  filteredBuildings,
  loadMore,
  locale,
  t,
  loadingMessage,
  errorTitle,
  emptyMessage,
  endMessage,
}: BuildingsContentAreaProps) {
  if (isLoading && buildings.length === 0) {
    return <BuildingsLoadingState message={loadingMessage} />;
  }

  if (error && buildings.length === 0) {
    return (
      <BuildingsStatusMessage
        bodyText={errorMessage}
        onRetry={onRetry}
        retryLabel={retryLabel}
        iconColor="var(--theme-accent-strong)"
        title={errorTitle}
      />
    );
  }

  if (filteredBuildings.length === 0) {
    return <BuildingsStatusMessage bodyText={emptyMessage} iconColor="var(--theme-text-faint)" />;
  }

  const firstCoverId = buildings.find((building) => building.images.length > 0)?.id;

  return (
    <>
      <InfiniteScroll
        dataLength={buildings.length}
        hasChildren
        next={loadMore}
        hasMore={hasMore}
        loader={
          <div className="building-archive-scroll-loader">
            <LoadingState message={loadingMessage} variant="inline" />
          </div>
        }
        endMessage={
          <div className="building-archive-scroll-end py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {endMessage}
            </p>
          </div>
        }
        style={{ overflow: 'visible' }}
        className="infinite-scroll-component"
      >
        <div className="building-archive-grid">
          {buildings.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              locale={locale}
              t={t}
              prioritizeCover={building.id === firstCoverId}
            />
          ))}
        </div>
      </InfiniteScroll>
      <ul className="building-archive-print-index">
        {filteredBuildings.map((building) => (
          <li className="building-archive-print-item" key={building.id}>
            {building.images.length > 0 ? (
              <div className="building-archive-print-image">
                {/* Native print has no image-preparation step, so these covers load in advance. */}
                <BuildingPreviewImage
                  building={building}
                  imageIndex={0}
                  alt=""
                  sizes="320px"
                  loading="eager"
                  fetchPriority="low"
                />
              </div>
            ) : null}
            <div className="building-archive-print-row">
              <span className="building-archive-print-heading">
                <Link href={getBuildingPath(building.id)} prefetch={false}>
                  {getBuildingName(building, locale)}
                </Link>
                <small>{t(`types.${building.buildType}`)}</small>
              </span>
              <span className="building-archive-print-coordinates">
                {building.coordinates.world} · {building.coordinates.x}, {building.coordinates.y},{' '}
                {building.coordinates.z}
              </span>
              {building.builders.length > 0 ? (
                <span className="building-archive-print-builders">
                  {sortBuildersByWeight(building.builders)
                    .map((builder) => builder.name)
                    .join(', ')}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
