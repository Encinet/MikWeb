'use client';

import { ArrowUpRight, Gavel, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommunityNotice } from '@/modules/community/model/board-types';
import { isCommunityBoardResponse } from '@/modules/community/model/board-types';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { Link } from '@/shared/i18n/routing';

const PAGE_SIZE = 12;

export function CommunityBoardPage() {
  const t = useTranslations('communityBoard');
  const locale = useLocale();
  const [entries, setEntries] = useState<CommunityNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const focusedRecordId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(dataApiUrl('/community/notices'), { cache: 'no-store' });
      const data: unknown = await response.json();
      if (!response.ok || !isCommunityBoardResponse(data)) throw new Error('invalid_response');
      const linkedId = window.location.hash
        .match(/^#notice-([0-9a-fA-F-]{36})$/)?.[1]
        .toLowerCase();
      let notices = data.notices;
      if (linkedId && !notices.some((entry) => entry.id === linkedId)) {
        try {
          const detailResponse = await fetch(dataApiUrl(`/community/notices/${linkedId}`), {
            cache: 'no-store',
          });
          const detail: unknown = await detailResponse.json();
          if (detailResponse.ok && detail && typeof detail === 'object' && 'notice' in detail) {
            const linked = { notices: [detail.notice] };
            if (isCommunityBoardResponse(linked)) notices = [...linked.notices, ...notices];
          }
        } catch {
          // Keep the recent board available if an older linked record cannot load.
        }
      }
      if (linkedId) {
        setExpandedIds((current) => {
          if (current.has(linkedId)) return current;
          const next = new Set(current);
          next.add(linkedId);
          return next;
        });
      }
      setEntries(notices);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshLinkedRecord = () => void load();
    void load();
    window.addEventListener('hashchange', refreshLinkedRecord);
    return () => window.removeEventListener('hashchange', refreshLinkedRecord);
  }, [load]);

  useEffect(() => {
    const linkedId = window.location.hash.match(/^#notice-([0-9a-fA-F-]{36})$/)?.[1].toLowerCase();
    if (!linkedId) focusedRecordId.current = null;
    const linkedIndex = linkedId ? entries.findIndex((entry) => entry.id === linkedId) : -1;
    if (linkedIndex >= visibleCount) {
      setVisibleCount(linkedIndex + 1);
      return;
    }
    if (linkedId && linkedId !== focusedRecordId.current && linkedIndex >= 0) {
      focusedRecordId.current = linkedId;
      window.requestAnimationFrame(() => {
        const record = document.getElementById(`notice-${linkedId}`);
        record?.scrollIntoView({ block: 'start' });
        record?.focus({ preventScroll: true });
      });
    }
  }, [entries, visibleCount]);

  const formatTime = (value: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Singapore',
    }).format(new Date(value));

  return (
    <div className="page-shell page-shell-stable community-board">
      <div className="page-shell-content community-board__inner">
        <header className="content-page-hero">
          <div>
            <h1>{t('hero.title')}</h1>
          </div>
          <Link href="/wiki?section=rules" className="community-board__rules-link">
            {t('hero.rules')} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <section className="community-board__records" aria-label={t('records.title')}>
          {loading ? <p role="status">{t('records.loading')}</p> : null}
          {loadError ? (
            <div role="alert" className="community-board__state">
              <p>{t('records.error')}</p>
              <button type="button" onClick={() => void load()}>
                {t('records.retry')}
              </button>
            </div>
          ) : null}
          {!loading && !loadError && entries.length === 0 ? (
            <p className="community-board__state">{t('records.empty')}</p>
          ) : null}
          <div className="community-board__list">
            {entries.slice(0, visibleCount).map((entry) => {
              const expanded = expandedIds.has(entry.id);
              return (
                <article
                  id={`notice-${entry.id}`}
                  tabIndex={-1}
                  aria-labelledby={`notice-title-${entry.id}`}
                  className="ui-card-surface community-board__entry"
                  key={entry.id}
                >
                  <div className="community-board__entry-top">
                    <span className="community-board__badge">{t(`kind.${entry.kind}`)}</span>
                    <span className="community-board__status">
                      {entry.status === 'open'
                        ? t(entry.kind === 'notice' ? 'status.noticeOpen' : 'status.objectionOpen')
                        : t(`status.${entry.status}`)}
                    </span>
                  </div>
                  <h3 id={`notice-title-${entry.id}`}>{entry.subject}</h3>
                  <div className="community-board__entry-meta">
                    <span>
                      {t('records.by', { author: entry.authorName })} ·{' '}
                      {formatTime(entry.createdAt)}
                    </span>
                    <span className="community-board__coordinate">
                      <MapPin size={15} aria-hidden="true" />
                      {entry.world} · {entry.x}, {entry.y}, {entry.z}
                    </span>
                  </div>
                  <div className="community-board__entry-footer">
                    <button
                      type="button"
                      className="community-board__expand"
                      aria-expanded={expanded}
                      aria-controls={`notice-content-${entry.id}`}
                      onClick={() =>
                        setExpandedIds((current) => {
                          const next = new Set(current);
                          if (next.has(entry.id)) next.delete(entry.id);
                          else next.add(entry.id);
                          return next;
                        })
                      }
                    >
                      {t(expanded ? 'records.collapse' : 'records.expand')}
                    </button>
                    <a
                      href={`#notice-${entry.id}`}
                      aria-label={t('records.permalinkLabel', { subject: entry.subject })}
                    >
                      {t('records.permalink')}
                    </a>
                  </div>
                  <div
                    id={`notice-content-${entry.id}`}
                    className="community-board__entry-content"
                    hidden={!expanded}
                  >
                    <p className="community-board__body">{entry.text}</p>
                    {entry.relatedNoticeId ? (
                      <p className="community-board__meta">
                        <a href={`#notice-${entry.relatedNoticeId}`}>
                          {t('records.relatedNotice')}
                        </a>
                      </p>
                    ) : null}
                    {entry.kind === 'notice' ? (
                      <p className="community-board__meta">
                        {t('records.noticeUntil', { time: formatTime(entry.deadline) })}
                      </p>
                    ) : null}
                    {entry.details ? (
                      <dl className="community-board__details">
                        {(['contact', 'scope', 'impact', 'proposal'] as const)
                          .filter((field) => Boolean(entry.details?.[field]))
                          .map((field) => (
                            <div key={field}>
                              <dt>{t(`detailLabels.${field}`)}</dt>
                              <dd>{entry.details?.[field]}</dd>
                            </div>
                          ))}
                      </dl>
                    ) : null}
                    {entry.ruling ? (
                      <div className="community-board__ruling">
                        <strong>
                          <Gavel size={16} aria-hidden="true" /> {t('ruling.title')}
                        </strong>
                        <p>{entry.ruling}</p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          {visibleCount < entries.length ? (
            <button
              type="button"
              className="community-board__show-more"
              onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            >
              {t('records.showMore')}
            </button>
          ) : null}
          {!loading && !loadError && entries.length >= 300 ? (
            <p className="community-board__hint">{t('records.latestLimit')}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
