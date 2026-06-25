import { ExternalLink, MapIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const MAP_URL = 'https://map.mcmik.top';

export default async function MapPage() {
  const t = await getTranslations('map');

  return (
    <main className="map-page">
      <section className="map-page__frame-shell" aria-label={t('frameLabel')}>
        <iframe
          src={MAP_URL}
          title={t('frameTitle')}
          className="map-page__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />

        <div className="map-page__overlay">
          <div className="map-page__frame-title">
            <span className="map-page__frame-dot" />
            <MapIcon className="h-4 w-4" />
            <span>{t('frameTitle')}</span>
          </div>
          <a
            href={MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="map-page__external-link"
          >
            <ExternalLink className="h-4 w-4" />
            <span>{t('actions.openExternal')}</span>
          </a>
        </div>
      </section>
    </main>
  );
}
