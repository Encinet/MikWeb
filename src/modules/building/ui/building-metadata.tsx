'use client';

import { Bell, CheckCircle, Copy, MapPin, User } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import { getBuildingSourceNotes } from '@/modules/building/lib/building-view-helpers';
import type { Building, LocalizedText } from '@/modules/building/model/building-types';
import { getLocalizedText, sortBuildersByWeight } from '@/modules/building/model/building-types';

export type BuildingsTranslator = ReturnType<typeof useTranslations<'buildings'>>;

interface BuildingTypeBadgeProps {
  buildType: Building['buildType'];
  compact?: boolean;
  t: BuildingsTranslator;
}

export function BuildingTypeBadge({ buildType, compact = false, t }: BuildingTypeBadgeProps) {
  const iconClassName = compact ? 'h-4 w-4' : 'h-4 w-4';
  const textClassName = compact ? 'text-xs font-medium' : 'text-sm font-medium';

  if (buildType === 'original') {
    return (
      <>
        <CheckCircle
          className={iconClassName}
          style={{ color: 'var(--theme-accent-green-strong)' }}
        />
        <span className={textClassName} style={{ color: 'var(--theme-accent-green-strong)' }}>
          {t('types.original')}
        </span>
      </>
    );
  }

  if (buildType === 'derivative') {
    return (
      <>
        <Copy className={iconClassName} style={{ color: 'var(--theme-accent-blue)' }} />
        <span className={textClassName} style={{ color: 'var(--theme-accent-blue)' }}>
          {t('types.derivative')}
        </span>
      </>
    );
  }

  return (
    <>
      <Copy className={iconClassName} style={{ color: 'var(--theme-accent-amber-strong)' }} />
      <span className={textClassName} style={{ color: 'var(--theme-accent-amber-strong)' }}>
        {t('types.replica')}
      </span>
    </>
  );
}

interface BuildingTagsProps {
  building: Building;
  getTagKey: (building: Building, tag: LocalizedText) => string;
  locale: string;
  compact?: boolean;
}

export function BuildingTags({ building, getTagKey, locale, compact = false }: BuildingTagsProps) {
  if (!building.tags || building.tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'mb-3' : ''}`}>
      {building.tags.map((tag) => (
        <span
          key={getTagKey(building, tag)}
          className={
            compact
              ? 'rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-md'
              : 'rounded-full px-3 py-1.5 text-sm font-medium backdrop-blur-md'
          }
          style={{
            background: 'var(--theme-surface-tag)',
            color: 'var(--theme-text-tag)',
            border: '1px solid var(--theme-border-tag)',
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

export function BuilderNames({ builders, compact = false }: BuilderNamesProps) {
  const sortedBuilders = sortBuildersByWeight(builders);
  const maxWeight = sortedBuilders[0]?.weight || 100;

  return sortedBuilders.map((builder, index) => {
    const isMainContributor = builder.weight === maxWeight;
    const contributionLevel = builder.weight / maxWeight;

    return (
      <span
        key={builder.uuid}
        className="transition-colors duration-200"
        style={{
          color: 'var(--theme-accent-green-strong)',
          fontWeight: isMainContributor ? 600 : 500,
          fontSize: compact
            ? isMainContributor
              ? '0.875rem'
              : '0.8125rem'
            : isMainContributor
              ? '1rem'
              : '0.875rem',
          opacity: 0.5 + contributionLevel * 0.5,
        }}
      >
        {builder.name}
        {index < builders.length - 1 && ','}
      </span>
    );
  });
}

interface BuildingSourceDetailsProps {
  building: Building;
  locale: string;
  compact?: boolean;
  t: BuildingsTranslator;
}

export function BuildingSourceDetails({
  building,
  locale,
  compact = false,
  t,
}: BuildingSourceDetailsProps) {
  if (!building.source) {
    return null;
  }

  if (compact) {
    return (
      <>
        {building.source.originalAuthor ? (
          <div
            className="flex items-start gap-2 border-t pt-2 text-sm"
            style={{ borderColor: 'var(--theme-border-glass-light)' }}
          >
            <User
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: 'var(--theme-accent-purple)' }}
            />
            <div className="min-w-0 flex-1">
              <span style={{ color: 'var(--theme-text-muted)' }}>{t('fields.originalAuthor')}</span>
              <p className="font-medium" style={{ color: 'var(--theme-accent-purple)' }}>
                {building.source.originalAuthor}
              </p>
            </div>
          </div>
        ) : null}
        {building.source.originalLink ? (
          <div className="flex items-start gap-2 text-sm">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: 'var(--theme-accent-purple)' }}
            />
            <div className="min-w-0 flex-1">
              <span style={{ color: 'var(--theme-text-muted)' }}>{t('fields.source')}</span>
              <a
                href={building.source.originalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate underline"
                style={{ color: 'var(--theme-accent-purple)' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = '1';
                }}
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

  return (
    <div
      className="space-y-4 border-t pt-4"
      style={{ borderColor: 'var(--theme-border-glass-light)' }}
    >
      {building.source.originalAuthor ? (
        <div className="flex items-start gap-3">
          <User
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--theme-accent-purple)' }}
          />
          <div className="flex-1">
            <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {t('fields.originalAuthor')}
            </span>
            <p className="mt-1 font-medium" style={{ color: 'var(--theme-accent-purple)' }}>
              {building.source.originalAuthor}
            </p>
          </div>
        </div>
      ) : null}
      {building.source.originalLink ? (
        <div className="flex items-start gap-3">
          <MapPin
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--theme-accent-purple)' }}
          />
          <div className="min-w-0 flex-1">
            <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {t('fields.source')}
            </span>
            <a
              href={building.source.originalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate underline"
              style={{ color: 'var(--theme-accent-purple)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.opacity = '1';
              }}
            >
              {building.source.originalLink}
            </a>
          </div>
        </div>
      ) : null}
      {building.source.notes ? (
        <div className="text-sm italic" style={{ color: 'var(--theme-text-muted)' }}>
          {getBuildingSourceNotes(building, locale)}
        </div>
      ) : null}
    </div>
  );
}

interface BuildingCardFactsProps {
  building: Building;
  formatDate: (timestamp: number | string) => string;
  locale: string;
  t: BuildingsTranslator;
}

export function BuildingCardFacts({ building, formatDate, locale, t }: BuildingCardFactsProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-sm">
        <MapPin
          className="h-4 w-4 shrink-0"
          style={{ color: 'var(--theme-accent-amber-strong)' }}
        />
        <span style={{ color: 'var(--theme-text-muted)' }}>{t('fields.coordinates')}</span>
        <code
          className="rounded px-2 py-1 font-mono text-xs"
          style={{
            background: 'var(--theme-surface-code)',
            color: 'var(--theme-accent-amber-strong)',
          }}
        >
          {building.coordinates.x}, {building.coordinates.y}, {building.coordinates.z}
        </code>
      </div>

      <div className="flex items-start gap-2 text-sm">
        <User
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: 'var(--theme-accent-green-strong)' }}
        />
        <div className="flex-1">
          <span style={{ color: 'var(--theme-text-muted)' }}>
            {building.builders.length > 1 ? t('fields.builders') : t('fields.builder')}
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <BuilderNames builders={building.builders} compact />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Bell className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-accent-blue)' }} />
        <span style={{ color: 'var(--theme-text-muted)' }}>{t('fields.buildDate')}</span>
        <span style={{ color: 'var(--theme-accent-blue)' }}>{formatDate(building.buildDate)}</span>
      </div>

      <BuildingSourceDetails building={building} locale={locale} compact t={t} />
    </div>
  );
}

interface BuildingDetailFactsProps {
  building: Building;
  formatDate: (timestamp: number | string) => string;
  locale: string;
  separated?: boolean;
  t: BuildingsTranslator;
}

export function BuildingDetailFacts({
  building,
  formatDate,
  locale,
  separated = true,
  t,
}: BuildingDetailFactsProps) {
  return (
    <div
      className={separated ? 'space-y-4 border-t pt-4' : 'space-y-4'}
      style={separated ? { borderColor: 'var(--theme-border-glass-light)' } : undefined}
    >
      <div className="flex items-start gap-3">
        <MapPin
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ color: 'var(--theme-accent-amber-strong)' }}
        />
        <div className="flex-1">
          <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {t('fields.coordinates')}
          </span>
          <div className="mt-1">
            <code
              className="rounded px-3 py-1.5 font-mono text-sm"
              style={{
                background: 'var(--theme-surface-code)',
                color: 'var(--theme-accent-amber-strong)',
              }}
            >
              {building.coordinates.x}, {building.coordinates.y}, {building.coordinates.z}
            </code>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <User
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ color: 'var(--theme-accent-green-strong)' }}
        />
        <div className="flex-1">
          <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {building.builders.length > 1 ? t('fields.builders') : t('fields.builder')}
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            <BuilderNames builders={building.builders} />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--theme-accent-blue)' }} />
        <div className="flex-1">
          <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {t('fields.buildDate')}
          </span>
          <div className="mt-1">
            <span className="text-base" style={{ color: 'var(--theme-accent-blue)' }}>
              {formatDate(building.buildDate)}
            </span>
          </div>
        </div>
      </div>

      <BuildingSourceDetails building={building} locale={locale} t={t} />
    </div>
  );
}
