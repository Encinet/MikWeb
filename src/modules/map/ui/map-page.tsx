import { ExternalLink, MapIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const MAP_URL = 'https://mikmap.yuuk.top';

export default async function MapPage() {
  const t = await getTranslations('map');

  return (
    <main className="map-page">
      <section className="map-page__hero">
        <div>
          <p className="map-page__eyebrow">{t('hero.eyebrow')}</p>
          <h1>{t('hero.title')}</h1>
          <p>{t('hero.description')}</p>
        </div>
        <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="map-page__external-link">
          <ExternalLink className="h-4 w-4" />
          <span>{t('actions.openExternal')}</span>
        </a>
      </section>

      <section className="map-page__frame-shell" aria-label={t('frameLabel')}>
        <div className="map-page__frame-toolbar">
          <div className="map-page__frame-title">
            <span className="map-page__frame-dot" />
            <MapIcon className="h-4 w-4" />
            <span>{t('frameTitle')}</span>
          </div>
        </div>
        <iframe
          src={MAP_URL}
          title={t('frameTitle')}
          className="map-page__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </section>
    </main>
  );
}
