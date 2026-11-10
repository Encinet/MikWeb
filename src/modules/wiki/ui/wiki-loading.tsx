import { getTranslations } from 'next-intl/server';
import { SkeletonLine } from '@/shared/ui/feedback/async-state';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

export async function WikiLoading() {
  const [t, commonT] = await Promise.all([getTranslations('wiki'), getTranslations('common')]);
  return (
    <section className="page-shell page-shell-stable" aria-busy="true" aria-label={t('title')}>
      <h1 className="text-3xl font-semibold">{t('title')}</h1>
      <LoadingState message={commonT('states.loading')} variant="inline" className="my-6" />
      <div className="space-y-5" aria-hidden="true">
        <SkeletonLine width="35%" height="1.5rem" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="80%" />
        <SkeletonLine width="85%" />
      </div>
    </section>
  );
}
