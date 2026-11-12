'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { createWikiSectionGroups, sortWikiSections } from '@/modules/wiki/lib/wiki-grouping';
import { useWikiStaffContent } from '@/modules/wiki/model/use-wiki-staff-content';
import WikiContentView from '@/modules/wiki/ui/wiki-content-view';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

export default function WikiContentGateway(props: ComponentProps<typeof WikiContentView>) {
  const locale = useLocale();
  const t = useTranslations('wiki');
  const staff = useWikiStaffContent(locale);
  const bundle = useMemo(() => {
    if (!staff.bundle) return props;
    const sections = sortWikiSections([...props.sections, ...staff.bundle.sections]);
    return {
      sections,
      sectionGroups: createWikiSectionGroups(sections),
      compiled: { ...props.compiled, ...staff.bundle.compiled },
      outlines: { ...props.outlines, ...staff.bundle.outlines },
      searchIndex: [...props.searchIndex, ...staff.bundle.searchIndex],
    };
  }, [props, staff.bundle]);

  return (
    <WikiContentView
      key={locale}
      {...props}
      {...bundle}
      staffStatus={
        staff.loading ? (
          <div className="wiki-access-status" role="status" aria-atomic="true">
            <ProgressRing size="sm" />
            <span className="wiki-access-status__message" title={t('staff.loading')}>
              {t('staff.loading')}
            </span>
          </div>
        ) : staff.failed ? (
          <div className="wiki-access-status" role="status" aria-atomic="true">
            <span className="wiki-access-status__message" title={t('staff.error')}>
              {t('staff.error')}
            </span>
            <button type="button" onClick={staff.retry}>
              {t('staff.retry')}
            </button>
          </div>
        ) : null
      }
    />
  );
}
