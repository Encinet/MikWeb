'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMMUNITY_PAGE_SIZE,
  filterCommunityNotices,
  getCommunityNoticeAnchor,
  getLinkedCommunityNoticeId,
} from '@/modules/community/lib/community-notices';
import { loadCommunityNotices } from '@/modules/community/lib/load-community-notices';
import type { CommunityNotice } from '@/modules/community/model/board-types';
import { CommunityNoticeEntry } from '@/modules/community/ui/community-notice-entry';
import { Link } from '@/shared/i18n/navigation';
import { LoadingState } from '@/shared/ui/feedback/loading-state';
import { SearchField } from '@/shared/ui/form/search-field';
import { ContentBrowserHeader } from '@/shared/ui/page/content-browser-header';

export function CommunityBoardPage() {
  const t = useTranslations('communityBoard');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const [entries, setEntries] = useState<CommunityNotice[]>([]);
  const entriesRef = useRef<CommunityNotice[]>([]);
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [linkedMissing, setLinkedMissing] = useState(false);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(COMMUNITY_PAGE_SIZE);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const activeQuery = query.trim() ? deferredQuery : '';
  const filtered = useMemo(
    () => filterCommunityNotices(entries, activeQuery),
    [entries, activeQuery],
  );
  const focusedRecordId = useRef<string | null>(null);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const targetId = getLinkedCommunityNoticeId(window.location.hash);
    setLoading(true);
    setLoadError(false);
    setLinkedMissing(false);
    try {
      const notices = await loadCommunityNotices(targetId);
      if (currentRequest !== requestId.current) return;
      setLinkedMissing(
        Boolean(
          targetId &&
            getLinkedCommunityNoticeId(window.location.hash) === targetId &&
            !notices.some((entry) => entry.id.toLowerCase() === targetId),
        ),
      );
      entriesRef.current = notices;
      setEntries(notices);
    } catch {
      if (currentRequest === requestId.current) setLoadError(true);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  const revealLinkedRecord = useCallback(
    (targetId: string | null) => {
      focusedRecordId.current = null;
      setLinkedId(targetId);
      setLinkedMissing(false);
      if (!targetId) return;
      setQuery('');
      setExpandedIds((current) => new Set(current).add(targetId));
      const knownRecord = entriesRef.current.some((entry) => entry.id.toLowerCase() === targetId);
      if (!knownRecord) void load();
      else {
        requestId.current++;
        setLoading(false);
        setLoadError(false);
      }
    },
    [load],
  );

  useEffect(() => {
    const syncLinkedRecord = () =>
      revealLinkedRecord(getLinkedCommunityNoticeId(window.location.hash));
    const initialId = getLinkedCommunityNoticeId(window.location.hash);
    setLinkedId(initialId);
    if (initialId) setExpandedIds(new Set([initialId]));
    void load();
    window.addEventListener('hashchange', syncLinkedRecord);
    return () => {
      requestId.current++;
      window.removeEventListener('hashchange', syncLinkedRecord);
    };
  }, [load, revealLinkedRecord]);

  useEffect(() => {
    if (
      loading ||
      loadError ||
      activeQuery ||
      !linkedId ||
      !expandedIds.has(linkedId) ||
      linkedId === focusedRecordId.current
    )
      return;
    const linkedIndex = filtered.findIndex((entry) => entry.id.toLowerCase() === linkedId);
    if (linkedIndex < 0) return;
    if (linkedIndex >= visibleCount) {
      setVisibleCount(linkedIndex + 1);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const record = document.getElementById(getCommunityNoticeAnchor(linkedId));
      if (!record) return;
      focusedRecordId.current = linkedId;
      record.scrollIntoView({ block: 'start', behavior: 'instant' });
      record.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeQuery, expandedIds, filtered, linkedId, loadError, loading, visibleCount]);

  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(COMMUNITY_PAGE_SIZE);
  };

  return (
    <div
      className="page-shell page-shell-stable community-board print-page-title"
      data-print-title={t('title')}
    >
      <div className="page-shell-content community-board__inner">
        <ContentBrowserHeader
          title={t('title')}
          search={
            <SearchField
              label={t('search.placeholder')}
              placeholder={t('search.placeholder')}
              clearLabel={commonT('actions.clearSearch')}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onClear={() => updateQuery('')}
            />
          }
        />
        <div className="community-board__toolbar">
          <p role="status" className="community-board__count">
            {!loading && !loadError
              ? activeQuery.trim()
                ? commonT('records.resultsCount', {
                    count: filtered.length,
                    total: entries.length,
                  })
                : commonT('records.count', { count: entries.length })
              : null}
          </p>
          <Link href="/wiki?section=rules" className="community-board__rules-link">
            {t('hero.rules')}
          </Link>
        </div>
        <section
          className="community-board__records page-state-region"
          aria-label={t('records.title')}
          aria-busy={loading}
        >
          {loading ? (
            <LoadingState message={t('records.loading')} variant="page" />
          ) : loadError ? (
            <div role="alert" className="community-board__state">
              <p>{t('records.error')}</p>
              <button type="button" onClick={() => void load()}>
                {commonT('actions.retry')}
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="community-board__state">
              <p>{t(linkedMissing ? 'records.linkUnavailable' : 'records.empty')}</p>
              {linkedMissing ? (
                <button type="button" onClick={() => void load()}>
                  {commonT('actions.retry')}
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {linkedMissing ? (
                <div role="status" className="community-board__hint">
                  <p>{t('records.linkUnavailable')}</p>
                  <button
                    type="button"
                    className="community-board__expand"
                    onClick={() => void load()}
                  >
                    {commonT('actions.retry')}
                  </button>
                </div>
              ) : null}
              {filtered.length === 0 ? (
                <div className="community-board__state">
                  <p>{t('records.noResults')}</p>
                  <button type="button" onClick={() => updateQuery('')}>
                    {commonT('actions.clearSearch')}
                  </button>
                </div>
              ) : (
                <div className="community-board__list">
                  {filtered.slice(0, visibleCount).map((entry) => (
                    <CommunityNoticeEntry
                      key={entry.id}
                      entry={entry}
                      locale={locale}
                      onOpenRecord={revealLinkedRecord}
                      expanded={expandedIds.has(entry.id.toLowerCase())}
                      onToggle={() =>
                        setExpandedIds((current) => {
                          const next = new Set(current);
                          const id = entry.id.toLowerCase();
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              )}
              {visibleCount < filtered.length ? (
                <button
                  type="button"
                  className="community-board__show-more"
                  onClick={() => setVisibleCount((current) => current + COMMUNITY_PAGE_SIZE)}
                >
                  {t('records.showMore')}
                </button>
              ) : null}
              {entries.length >= 300 ? (
                <p className="community-board__hint">{t('records.latestLimit')}</p>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
