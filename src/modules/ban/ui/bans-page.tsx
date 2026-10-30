'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { BANS_PAGE_SIZE, filterBanEntries } from '@/modules/ban/lib/ban-catalog';
import { useBans } from '@/modules/ban/model/use-bans';
import { BanRecordList } from '@/modules/ban/ui/ban-record-list';
import { SearchField } from '@/shared/ui/form/search-field';
import { ContentBrowserHeader } from '@/shared/ui/page/content-browser-header';

export default function BansPage() {
  const t = useTranslations('bans');
  const locale = useLocale();
  const { entries, isLoading, error, retry } = useBans(t('states.error'));
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [visibleCount, setVisibleCount] = useState(BANS_PAGE_SIZE);
  const filtered = useMemo(
    () => filterBanEntries(entries, deferredQuery),
    [entries, deferredQuery],
  );

  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(BANS_PAGE_SIZE);
  };
  return (
    <div
      className="page-shell page-shell-stable bans-page print-page-title"
      data-print-title={t('meta.title')}
    >
      <div className="bans-page__inner page-shell-content">
        <ContentBrowserHeader
          title={t('hero.title')}
          search={
            <SearchField
              label={t('search.placeholder')}
              placeholder={t('search.placeholder')}
              clearLabel={t('search.clear')}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onClear={() => updateQuery('')}
            />
          }
        />
        <div className="page-state-region" aria-busy={isLoading}>
          {isLoading ? (
            <div className="bans-loading" role="status">
              <span className="bans-loading__indicator" aria-hidden="true" />
              <p>{t('states.loading')}</p>
            </div>
          ) : error ? (
            <div className="bans-state" role="alert">
              <h2>{t('states.error')}</h2>
              {error !== t('states.error') ? <p>{error}</p> : null}
              <button type="button" className="bans-action" onClick={() => void retry()}>
                {t('actions.retry')}
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="bans-state">
              <p>{t('states.empty')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bans-state">
              <p>{t('states.noResults')}</p>
              <button type="button" className="bans-action" onClick={() => updateQuery('')}>
                {t('search.clear')}
              </button>
            </div>
          ) : (
            <>
              <BanRecordList
                entries={filtered.slice(0, visibleCount)}
                locale={locale}
                summary={
                  deferredQuery.trim()
                    ? t('resultsCount', { count: filtered.length, total: entries.length })
                    : t('recordsCount', { count: entries.length })
                }
              />
              {visibleCount < filtered.length ? (
                <div className="bans-load-more">
                  <p className="bans-visible-count">
                    {t('shownCount', {
                      count: Math.min(visibleCount, filtered.length),
                      total: filtered.length,
                    })}
                  </p>
                  <button
                    type="button"
                    className="bans-action"
                    onClick={() => setVisibleCount((count) => count + BANS_PAGE_SIZE)}
                  >
                    {t('actions.loadMore', {
                      count: Math.min(BANS_PAGE_SIZE, filtered.length - visibleCount),
                    })}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
