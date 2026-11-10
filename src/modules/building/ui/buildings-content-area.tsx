'use client';

import type { useTranslations } from 'next-intl';
import InfiniteScroll from 'react-infinite-scroll-component';
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
  onRetry: () => void;
  retryLabel: string;
  errorMessage: string;
  filteredCount: number;
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
  filteredCount,
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

  if (filteredCount === 0) {
    return <BuildingsStatusMessage bodyText={emptyMessage} iconColor="var(--theme-text-faint)" />;
  }

  const firstCoverId = buildings.find((building) => building.images.length > 0)?.id;

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
  );
}
