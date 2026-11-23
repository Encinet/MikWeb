'use client';

import { UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { Sponsor } from '@/modules/sponsor/model/sponsor-types';
import { createSponsorWall } from '@/modules/sponsor/model/sponsor-wall-data';

const SPONSOR_PAGE_SIZE = 24;

function focusNewSponsor(item: HTMLLIElement | null) {
  item?.focus();
}

export function SponsorsWall({ entries }: { entries: Sponsor[] }) {
  const t = useTranslations('sponsors');
  const locale = useLocale();
  const [visibleCount, setVisibleCount] = useState(SPONSOR_PAGE_SIZE);
  const { sponsors, currency, dateTime } = useMemo(
    () => ({
      sponsors: createSponsorWall(entries, locale),
      currency: new Intl.NumberFormat(locale, { style: 'currency', currency: 'CNY' }),
      dateTime: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    }),
    [entries, locale],
  );

  if (sponsors.length === 0) {
    return (
      <div className="page-state-region sponsors-state">
        <p role="status">{t('states.empty')}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="sponsors-list" role="list" aria-label={t('title')}>
        {sponsors.slice(0, visibleCount).map(({ uuid, name, totalAmount, messages }, index) => {
          const justRevealed = index === visibleCount - SPONSOR_PAGE_SIZE && index > 0;
          return (
            <li
              key={uuid}
              className="sponsors-entry"
              ref={justRevealed ? focusNewSponsor : undefined}
              tabIndex={justRevealed ? -1 : undefined}
            >
              <span className="sponsors-avatar" aria-hidden="true">
                <UserRound size={19} />
              </span>
              <div>
                <div className="sponsors-entry__byline">
                  <bdi>{name}</bdi>
                  <span className="sponsors-entry__amount">
                    <span className="sr-only">{t('list.totalAmount')} </span>
                    {currency.format(totalAmount)}
                  </span>
                </div>
                {messages.length > 0 && (
                  <ol className="sponsors-entry__messages" role="list">
                    {messages.map(({ index: orderIndex, at, text }) => (
                      <li key={orderIndex} className="sponsors-message">
                        <p dir="auto">{text}</p>
                        <time dateTime={at}>{dateTime.format(new Date(at))}</time>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {sponsors.length > visibleCount && (
        <div className="sponsors-load-more">
          <button
            className="ui-action-button"
            type="button"
            onClick={() => setVisibleCount((count) => count + SPONSOR_PAGE_SIZE)}
          >
            {t('list.loadMore')}
          </button>
        </div>
      )}
    </>
  );
}
