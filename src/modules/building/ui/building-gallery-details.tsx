'use client';

import { ArrowUpRight, CalendarDays, ChevronDown, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import {
  formatBuildingDate,
  getBuildingDescription,
  getBuildingName,
} from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import { BuildingCardActions } from '@/modules/building/ui/building-card-actions';
import {
  BuilderNames,
  BuilderSummary,
  BuildingSourceDetails,
  BuildingTags,
  BuildingTypeBadge,
} from '@/modules/building/ui/building-metadata';
import { mapPositionUrl } from '@/modules/map/model/map-world';
import { CopyButton } from '@/shared/ui/action/copy-button';

export function BuildingGalleryDetails({
  building,
  titleId,
  modal,
}: {
  building: Building;
  titleId: string;
  modal: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const Heading = modal ? 'h2' : 'h1';
  const description = getBuildingDescription(building, locale).trim();
  const { world, x, y, z } = building.coordinates;
  const coordinates = `${x}, ${y}, ${z}`;
  const mapUrl = mapPositionUrl(world, x, z);

  return (
    <section className={`building-archive-info-bar ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <div className="building-detail-summary">
        <div className="building-detail-identity">
          <div className="building-archive-info-bar__header">
            <Heading id={titleId}>{getBuildingName(building, locale)}</Heading>
            <span className="building-detail-type">
              <BuildingTypeBadge buildType={building.buildType} compact t={t} />
            </span>
          </div>
          <div className="building-detail-builders">
            <span className="building-detail-label">{t('details.builders')}</span>
            <BuilderSummary builders={building.builders} compact maxVisible={2} />
          </div>
        </div>
        <dl className="building-detail-facts">
          <div className="building-detail-location">
            <dt>
              <MapPin aria-hidden="true" />
              <span>{world}</span>
            </dt>
            <dd>
              <a
                className="building-gallery-map-link"
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t('actions.viewOnMap')}
              >
                <span className="building-detail-world-inline">{world}</span>
                {coordinates}
              </a>
              <CopyButton
                value={`${world} · ${coordinates}`}
                label={t('share.copyCoordinates')}
                className="building-coordinate-copy"
              />
            </dd>
          </div>
          <div className="building-detail-date">
            <dt>
              <CalendarDays aria-hidden="true" />
              <span>{t('details.buildDate')}</span>
            </dt>
            <dd>
              <time dateTime={building.buildDate}>
                {formatBuildingDate(building.buildDate, locale)}
              </time>
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={expanded ? commonT('actions.collapseDetails') : t('dialog.expandDetails')}
          className="building-archive-info-bar__expand"
        >
          <span className="building-detail-toggle-label" aria-hidden="true">
            <span className="building-detail-toggle-label__expand">
              {t('dialog.expandDetails')}
            </span>
            <span className="building-detail-toggle-label__collapse">
              {commonT('actions.collapseDetails')}
            </span>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
      <div
        className={`building-archive-info-expanded ${expanded ? 'is-expanded' : 'is-collapsed'}`}
        id={detailsId}
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div className="building-archive-info-expanded__clip">
          <div className="building-detail-body">
            <div className="building-detail-about">
              {description ? (
                <p className="building-archive-info-expanded__desc">{description}</p>
              ) : null}
              <BuildingTags building={building} locale={locale} compact />
              {building.builders.length > 2 ? (
                <div className="building-detail-contributors">
                  <h3>{t('details.builders')}</h3>
                  <div className="building-detail-builders">
                    <BuilderNames builders={building.builders} compact />
                  </div>
                </div>
              ) : null}
            </div>
            {building.source ? (
              <div className="building-detail-source">
                <BuildingSourceDetails building={building} locale={locale} t={t} />
              </div>
            ) : null}
          </div>
          <div className="building-archive-info-bar__actions">
            <BuildingCardActions building={building} />
            <a
              className="building-detail-map-action"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin aria-hidden="true" />
              <span>{t('actions.viewOnMap')}</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
