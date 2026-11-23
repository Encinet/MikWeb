'use client';

import { UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import type { createSponsorWall } from '@/modules/sponsor/model/sponsor-wall-data';

const SPONSOR_PAGE_SIZE = 24;
type SponsorWallEntry = ReturnType<typeof createSponsorWall>[number];

function sponsorId(uuid: string) {
  return `sponsor-${uuid.toLowerCase()}`;
}

function SponsorAvatar({ uuid, name }: Pick<SponsorWallEntry, 'uuid' | 'name'>) {
  return (
    <span className="sponsors-avatar" aria-hidden="true">
      <MinecraftAvatar uuid={uuid} name={name} size={36} fallback={null} />
      <UserRound size={19} />
    </span>
  );
}

export function SponsorsIndex({ sponsors }: { sponsors: readonly SponsorWallEntry[] }) {
  const t = useTranslations('sponsors');
  return (
    <nav className="sponsors-index" aria-labelledby="sponsors-index-label">
      <p id="sponsors-index-label">{t('list.jumpToSponsor')}</p>
      <ul className="sponsors-index__list" role="list">
        {sponsors.map(({ uuid, name }) => {
          const label = name.trim() || uuid;
          return (
            <li key={uuid}>
              <a href={`#${sponsorId(uuid)}`} aria-label={label} title={label}>
                <SponsorAvatar uuid={uuid} name={name} />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function focusNewSponsor(item: HTMLLIElement | null) {
  item?.focus();
}

export function SponsorsWall({ sponsors }: { sponsors: readonly SponsorWallEntry[] }) {
  const t = useTranslations('sponsors');
  const locale = useLocale();
  const [{ visibleCount, focusIndex }, setPage] = useState({
    visibleCount: SPONSOR_PAGE_SIZE,
    focusIndex: -1,
  });
  const [targetId, setTargetId] = useState('');
  const { currency, dateTime } = useMemo(
    () => ({
      currency: new Intl.NumberFormat(locale, { style: 'currency', currency: 'CNY' }),
      dateTime: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    }),
    [locale],
  );

  useEffect(() => {
    function revealFragment() {
      const id = window.location.hash.slice(1);
      const index = sponsors.findIndex(({ uuid }) => sponsorId(uuid) === id);
      setTargetId(index >= 0 ? id : '');
      if (index < 0) return;

      const requiredCount = (Math.floor(index / SPONSOR_PAGE_SIZE) + 1) * SPONSOR_PAGE_SIZE;
      setPage((page) =>
        page.visibleCount >= requiredCount ? page : { visibleCount: requiredCount, focusIndex: -1 },
      );
    }

    revealFragment();
    window.addEventListener('hashchange', revealFragment);
    return () => window.removeEventListener('hashchange', revealFragment);
  }, [sponsors]);

  useEffect(() => {
    if (!targetId) return;
    // Wait for the entry to mount when the data or its page was not yet visible.
    const target = document.getElementById(targetId);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start' });
  }, [targetId]);

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
          const id = sponsorId(uuid);
          return (
            <li
              key={uuid}
              id={id}
              className="sponsors-entry"
              data-targeted={id === targetId ? '' : undefined}
              ref={index === focusIndex ? focusNewSponsor : undefined}
              tabIndex={-1}
            >
              <SponsorAvatar uuid={uuid} name={name} />
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
            onClick={() =>
              setPage(({ visibleCount }) => ({
                visibleCount: visibleCount + SPONSOR_PAGE_SIZE,
                focusIndex: visibleCount,
              }))
            }
          >
            {t('list.loadMore')}
          </button>
        </div>
      )}
    </>
  );
}
