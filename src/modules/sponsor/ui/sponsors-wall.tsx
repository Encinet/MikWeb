'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { SPONSOR_PAGE_SIZE } from '@/modules/sponsor/model/sponsor-limits';
import type { SponsorEntry } from '@/modules/sponsor/model/sponsor-types';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

function formatSponsorTime(value: number | null, locale: string, unknownLabel: string): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return unknownLabel;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value * 1000));
}

interface SponsorsWallProps {
  entries: SponsorEntry[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Browser-side sponsor wall backed by the public MikData API. Rows arrive newest-first;
 * avatars reuse the player Minecraft-avatar failover, remarks expand under their row,
 * and "load more" only reveals more rows, matching the ban wall's local expansion.
 */
export function SponsorsWall({ entries, error, isLoading, retry }: SponsorsWallProps) {
  const locale = useLocale();
  const t = useTranslations('sponsor');
  const commonT = useTranslations('common');
  const [visibleCount, setVisibleCount] = useState(SPONSOR_PAGE_SIZE);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const shownEntries = entries.slice(0, visibleCount);
  const hasMore = entries.length > visibleCount;

  const formatTime = (value: number | null) =>
    formatSponsorTime(value, locale, t('states.timeUnknown'));

  const toggleRemarks = (uuid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  return (
    <div className="sponsors-wall">
      {isLoading ? (
        <div className="page-state-region">
          <LoadingState message={commonT('states.loading')} variant="page" />
        </div>
      ) : error !== null ? (
        <div className="page-state-region">
          <div className="sponsors-state" role="alert">
            <p>{t('states.error')}</p>
            {error !== t('states.error') ? <p>{error}</p> : null}
            <button className="sponsors-action" type="button" onClick={retry}>
              {commonT('actions.retry')}
            </button>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="sponsors-state">
          <p>{t('states.empty')}</p>
        </div>
      ) : (
        <>
          <div className="sponsors-wall__summary" role="status">
            <p className="sponsors-wall__count">
              <span className="sponsors-wall__count-number">{entries.length}</span>
              {t('countUnit')}
            </p>
          </div>

          <table className="sponsors-table">
            <thead>
              <tr>
                <th scope="col">{t('fields.sponsor')}</th>
                <th scope="col">{t('fields.amount')}</th>
                <th scope="col">{t('fields.remarks')}</th>
              </tr>
            </thead>
            {shownEntries.map((entry) => {
              const isOpen = expanded.has(entry.uuid);
              return (
                <tbody key={entry.uuid} className="sponsors-record-group">
                  <tr className="sponsors-record">
                    <td className="sponsors-record__sponsor">
                      <div className="sponsors-sponsor">
                        <MinecraftAvatar
                          name={entry.name}
                          size={40}
                          uuid={entry.uuid}
                          className="sponsors-avatar"
                        />
                        <span className="sponsors-sponsor__name">{entry.name}</span>
                      </div>
                    </td>
                    <td className="sponsors-record__amount">
                      <span className="sponsors-record__mobile-label" aria-hidden="true">
                        {t('fields.amount')}
                      </span>
                      {entry.totalAmount ? `¥${entry.totalAmount}` : t('states.amountUnknown')}
                    </td>
                    <td className="sponsors-record__remarks">
                      <span className="sponsors-record__mobile-label" aria-hidden="true">
                        {t('fields.remarks')}
                      </span>
                      {entry.orders.length > 0 ? (
                        <button
                          aria-expanded={isOpen}
                          className="sponsors-remarks__toggle"
                          type="button"
                          onClick={() => toggleRemarks(entry.uuid)}
                        >
                          <span>{t('remarkCount', { count: entry.orders.length })}</span>
                          <span aria-hidden="true" className="sponsors-remarks__chevron">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                      ) : (
                        <span className="sponsors-record__none">{t('states.noRemarks')}</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && entry.orders.length > 0 ? (
                    <tr className="sponsors-remarks-row">
                      <td colSpan={3}>
                        <ul className="sponsors-remarks">
                          {entry.orders.map((order) => (
                            <li key={order.id} className="sponsors-remark">
                              <span className="sponsors-remark__amount">¥{order.amount}</span>
                              <span className="sponsors-remark__text">{order.remark}</span>
                              <time className="sponsors-remark__time">{formatTime(order.at)}</time>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              );
            })}
          </table>

          {hasMore ? (
            <div className="sponsors-load-more">
              <button
                className="sponsors-action"
                type="button"
                onClick={() => setVisibleCount((count) => count + SPONSOR_PAGE_SIZE)}
              >
                {t('actions.loadMore')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
