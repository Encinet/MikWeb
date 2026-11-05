'use client';

import type { useTranslations } from 'next-intl';
import InfiniteScroll from 'react-infinite-scroll-component';
import Masonry from 'react-masonry-css';

import { BUILDING_MASONRY_BREAKPOINT_COLUMNS } from '@/modules/building/lib/building-catalog';
import type { Building } from '@/modules/building/model/building-types';
import { BuildingCard } from '@/modules/building/ui/building-card';
import {
  BuildingsLoadingState,
  BuildingsStatusMessage,
} from '@/modules/building/ui/buildings-status-states';

type BuildingsTranslator = ReturnType<typeof useTranslations<'buildings'>>;

interface BuildingsContentAreaProps {
  buildings: Building[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  filteredCount: number;
  isImageError: (url: string) => boolean;
  onImageError: (url: string) => void;
  onOpenBuilding: (building: Building) => void;
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
  filteredCount,
  isImageError,
  onImageError,
  onOpenBuilding,
  loadMore,
  locale,
  t,
  loadingMessage,
  errorTitle,
  emptyMessage,
  endMessage,
}: BuildingsContentAreaProps) {
  if (isLoading) {
    return <BuildingsLoadingState message={loadingMessage} />;
  }

  if (error) {
    return (
      <BuildingsStatusMessage
        bodyText={error}
        iconColor="var(--theme-accent-strong)"
        title={errorTitle}
      />
    );
  }

  if (filteredCount === 0) {
    return <BuildingsStatusMessage bodyText={emptyMessage} iconColor="var(--theme-text-faint)" />;
  }

  return (
    <InfiniteScroll
      dataLength={buildings.length}
      hasChildren
      next={loadMore}
      hasMore={hasMore}
      loader={
        <div className="building-archive-scroll-loader" role="status" aria-live="polite">
          <span className="building-archive-loader" aria-hidden="true">
            <span className="building-archive-loader__core" />
          </span>
          <span className="sr-only">{loadingMessage}</span>
        </div>
      }
      endMessage={
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {endMessage}
          </p>
        </div>
      }
      style={{ overflow: 'visible' }}
      className="infinite-scroll-component"
    >
      <Masonry
        breakpointCols={BUILDING_MASONRY_BREAKPOINT_COLUMNS}
        className="building-archive-masonry"
        columnClassName="building-archive-masonry__column"
      >
        {buildings.map((building) => (
          <BuildingCard
            key={building.id}
            building={building}
            isImageError={isImageError}
            locale={locale}
            onImageError={onImageError}
            onOpen={onOpenBuilding}
            t={t}
          />
        ))}
      </Masonry>
    </InfiniteScroll>
  );
}
