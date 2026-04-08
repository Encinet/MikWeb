import { getLocale, getTranslations } from 'next-intl/server';

import NotFoundView from '@/site/not-found/ui/not-found-view';

export default async function LocalizedNotFound() {
  const currentLocale = await getLocale();
  const notFoundTranslations = await getTranslations({
    locale: currentLocale,
    namespace: 'notFound',
  });

  return (
    <NotFoundView
      title={notFoundTranslations('hero.title')}
      description={notFoundTranslations('hero.description')}
      homeHref={`/${currentLocale}`}
      homeLabel={notFoundTranslations('actions.returnHome')}
    />
  );
}
