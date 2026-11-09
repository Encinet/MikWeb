'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { createWikiSectionGroups, sortWikiSections } from '@/modules/wiki/lib/wiki-grouping';
import { useWikiStaffContent } from '@/modules/wiki/model/use-wiki-staff-content';
import WikiContentView from '@/modules/wiki/ui/wiki-content-view';

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
      content: { ...props.content, ...staff.bundle.content },
      compiled: { ...props.compiled, ...staff.bundle.compiled },
      outlines: { ...props.outlines, ...staff.bundle.outlines },
      searchIndex: [...props.searchIndex, ...staff.bundle.searchIndex],
    };
  }, [props, staff.bundle]);

  return (
    <WikiContentView
      {...props}
      {...bundle}
      staffStatus={
        staff.loading ? (
          <p className="wiki-staff-status" role="status">
            {t('staff.loading')}
          </p>
        ) : staff.failed ? (
          <div className="wiki-staff-status" role="status">
            <p>{t('staff.error')}</p>
            <button type="button" onClick={staff.retry}>
              {t('staff.retry')}
            </button>
          </div>
        ) : null
      }
    />
  );
}
