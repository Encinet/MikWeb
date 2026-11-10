import { getTranslations } from 'next-intl/server';
import { BuildingsLoadingState } from '@/modules/building/ui/buildings-status-states';

export async function BuildingsLoading() {
  const [t, commonT] = await Promise.all([getTranslations('buildings'), getTranslations('common')]);
  return (
    <section className="building-archive-page page-shell page-shell-stable" aria-busy="true">
      <h1 className="text-3xl font-semibold">{t('title')}</h1>
      <BuildingsLoadingState message={commonT('states.loading')} />
    </section>
  );
}
