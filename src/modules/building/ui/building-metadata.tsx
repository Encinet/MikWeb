'use client';

import { CheckCircle, Copy, MapPin, User } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import { sortBuildersByWeight } from '@/modules/building/lib/building-builders';
import { getBuildingSourceNotes } from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { getLocalizedText } from '@/shared/i18n/localized-text';

export type BuildingsTranslator = ReturnType<typeof useTranslations<'buildings'>>;

interface BuildingTypeBadgeProps {
  buildType: Building['buildType'];
  compact?: boolean;
  t: BuildingsTranslator;
}

export function BuildingTypeBadge({ buildType, compact = false, t }: BuildingTypeBadgeProps) {
  const iconClassName = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textClassName = compact ? 'text-xs font-semibold' : 'text-sm font-semibold';

  if (buildType === 'original') {
    return (
      <>
        <CheckCircle className={iconClassName} style={{ color: 'var(--theme-accent-strong)' }} />
        <span className={textClassName} style={{ color: 'var(--theme-accent-strong)' }}>
          {t('types.original')}
        </span>
      </>
    );
  }

  if (buildType === 'derivative') {
    return (
      <>
        <Copy className={iconClassName} style={{ color: 'var(--theme-text-muted-strong)' }} />
        <span className={textClassName} style={{ color: 'var(--theme-text-muted-strong)' }}>
          {t('types.derivative')}
        </span>
      </>
    );
  }

  return (
    <>
      <Copy className={iconClassName} style={{ color: 'var(--theme-text-muted)' }} />
      <span className={textClassName} style={{ color: 'var(--theme-text-muted)' }}>
        {t('types.replica')}
      </span>
    </>
  );
}

interface BuildingTagsProps {
  building: Building;
  locale: string;
  compact?: boolean;
}

export function BuildingTags({ building, locale, compact = false }: BuildingTagsProps) {
  if (!building.tags || building.tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {building.tags.map((tag) => (
        <span
          key={`${building.id}:${getLocalizedText(tag, locale)}`}
          className={
            compact
              ? 'rounded-full px-2.5 py-1 text-xs font-medium'
              : 'rounded-full px-3 py-1 text-xs font-medium'
          }
          style={{
            background: 'color-mix(in srgb, var(--theme-accent) 8%, transparent)',
            color: 'var(--theme-accent-strong)',
            border: '1px solid color-mix(in srgb, var(--theme-accent) 15%, transparent)',
          }}
        >
          {getLocalizedText(tag, locale)}
        </span>
      ))}
    </div>
  );
}

interface BuilderNamesProps {
  builders: Building['builders'];
  compact?: boolean;
}

interface BuilderSummaryProps extends BuilderNamesProps {
  maxVisible?: number;
}

const BUILDER_SUMMARY_RELATIVE_WEIGHT = 0.5;
const BUILDER_SUMMARY_MIN_SHARE = 0.25;

function getBuilderSummary(builders: Building['builders'], maxVisible: number) {
  const sortedBuilders = sortBuildersByWeight(builders);

  if (sortedBuilders.length <= maxVisible) {
    return { visibleBuilders: sortedBuilders, hiddenBuilders: [] };
  }

  const topWeight = sortedBuilders[0]?.weight || 0;
  const totalWeight = sortedBuilders.reduce(
    (total, builder) => total + Math.max(builder.weight, 0),
    0,
  );
  const visibleBuilders = sortedBuilders
    .filter((builder, index) => {
      if (index === 0) return true;

      const relativeWeight = topWeight > 0 ? builder.weight / topWeight : 0;
      const share = totalWeight > 0 ? builder.weight / totalWeight : 0;
      return (
        relativeWeight >= BUILDER_SUMMARY_RELATIVE_WEIGHT || share >= BUILDER_SUMMARY_MIN_SHARE
      );
    })
    .slice(0, maxVisible);
  const visibleBuilderIds = new Set(visibleBuilders.map((builder) => builder.uuid));

  return {
    visibleBuilders,
    hiddenBuilders: sortedBuilders.filter((builder) => !visibleBuilderIds.has(builder.uuid)),
  };
}

function BuilderPill({
  builder,
  compact,
  primary,
}: {
  builder: Building['builders'][number];
  compact: boolean;
  primary: boolean;
}) {
  const avatarSize = compact ? 18 : 22;

  return (
    <span
      className={`building-builder-pill ${compact ? 'building-builder-pill--compact' : ''} ${
        primary ? 'building-builder-pill--primary' : ''
      }`}
    >
      <MinecraftAvatar
        uuid={builder.uuid}
        name={builder.name}
        size={avatarSize}
        className="building-builder-pill__avatar"
      />
      <span className="building-builder-pill__name">{builder.name}</span>
    </span>
  );
}

function BuilderAvatarStack({
  builders,
  compact,
}: {
  builders: Building['builders'];
  compact: boolean;
}) {
  if (builders.length === 0) {
    return null;
  }

  const avatarSize = compact ? 18 : 20;
  const shownBuilders = builders.slice(0, 3);

  return (
    <span className="building-builder-stack" role="img" aria-label={`+${builders.length}`}>
      {shownBuilders.map((builder) => (
        <MinecraftAvatar
          key={builder.uuid}
          uuid={builder.uuid}
          name={builder.name}
          size={avatarSize}
          className="building-builder-stack__avatar"
        />
      ))}
      <span className="building-builder-stack__count">+{builders.length}</span>
    </span>
  );
}

export function BuilderSummary({ builders, compact = false, maxVisible = 3 }: BuilderSummaryProps) {
  const { visibleBuilders, hiddenBuilders } = getBuilderSummary(builders, maxVisible);
  const maxWeight = visibleBuilders[0]?.weight || 100;

  return (
    <span className="building-builder-summary">
      {visibleBuilders.map((builder) => (
        <BuilderPill
          key={builder.uuid}
          builder={builder}
          compact={compact}
          primary={builder.weight === maxWeight}
        />
      ))}
      <BuilderAvatarStack builders={hiddenBuilders} compact={compact} />
    </span>
  );
}

export function BuilderNames({ builders, compact = false }: BuilderNamesProps) {
  const sortedBuilders = sortBuildersByWeight(builders);
  const maxWeight = sortedBuilders[0]?.weight || 100;

  return sortedBuilders.map((builder) => {
    const isMainContributor = builder.weight === maxWeight;

    return (
      <BuilderPill
        key={builder.uuid}
        builder={builder}
        compact={compact}
        primary={isMainContributor}
      />
    );
  });
}

interface BuildingSourceDetailsProps {
  building: Building;
  locale: string;
  t: BuildingsTranslator;
}

export function BuildingSourceDetails({ building, locale, t }: BuildingSourceDetailsProps) {
  if (!building.source) {
    return null;
  }

  return (
    <>
      {building.source.originalAuthor ? (
        <div
          className="flex items-start gap-2 border-t pt-2 text-sm"
          style={{ borderColor: 'var(--theme-border-glass-light)' }}
        >
          <User
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: 'var(--theme-accent-strong)' }}
          />
          <div className="min-w-0 flex-1">
            <span style={{ color: 'var(--theme-text-muted)' }}>{t('fields.originalAuthor')}</span>
            <p className="font-medium" style={{ color: 'var(--theme-text-muted-strong)' }}>
              {building.source.originalAuthor}
            </p>
          </div>
        </div>
      ) : null}
      {building.source.originalLink ? (
        <div className="flex items-start gap-2 text-sm">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: 'var(--theme-text-muted-strong)' }}
          />
          <div className="min-w-0 flex-1">
            <span style={{ color: 'var(--theme-text-muted)' }}>{t('fields.source')}</span>
            <a
              href={building.source.originalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-content-link ui-content-link--accent block truncate"
            >
              {building.source.originalLink}
            </a>
          </div>
        </div>
      ) : null}
      {building.source.notes ? (
        <div className="pt-1 text-xs italic" style={{ color: 'var(--theme-text-muted)' }}>
          {getBuildingSourceNotes(building, locale)}
        </div>
      ) : null}
    </>
  );
}
