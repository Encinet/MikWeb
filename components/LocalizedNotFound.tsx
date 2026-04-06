import { getLocale, getTranslations } from 'next-intl/server';

import NotFoundView from '@/components/NotFoundView';

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
