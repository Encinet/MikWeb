import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { MAP_URL } from '@/modules/map/model/map-world';

export default async function MapPage() {
  const t = await getTranslations('map');

  return (
    <div className="map-page">
      <section className="map-page__frame-shell" aria-label={t('title')}>
        <iframe
          src={MAP_URL}
          title={t('title')}
          className="map-page__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />

        <a
          href={MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="map-page__external-link"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('actions.openExternal')}</span>
        </a>
      </section>
    </div>
  );
}
