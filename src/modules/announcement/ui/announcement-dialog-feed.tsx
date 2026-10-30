'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import {
  getAnnouncementKey,
  groupAnnouncementsByDate,
} from '@/modules/announcement/lib/announcement-feed';
import { parseAnnouncementDate } from '@/modules/announcement/lib/format-announcement-date';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { AnnouncementBody } from '@/modules/announcement/ui/announcement-body';

interface AnnouncementDialogFeedProps {
  announcements: AnnouncementItem[];
  selectedAnnouncementKey?: string | null;
}

export function AnnouncementDialogFeed({
  announcements,
  selectedAnnouncementKey,
}: AnnouncementDialogFeedProps) {
  const locale = useLocale();
  const t = useTranslations('home.announcements');
  const selectedRef = useRef<HTMLElement>(null);
  const groups = groupAnnouncementsByDate(announcements);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (!selectedAnnouncementKey) return;
    const target = selectedRef.current;
    const scroller = target?.closest('.app-dialog-body');
    if (!target || !scroller) return;
    const frame = requestAnimationFrame(() => {
      scroller.scrollTo({
        top:
          scroller.scrollTop +
          target.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top -
          16,
        behavior: 'instant',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedAnnouncementKey]);

  return (
    <div className="announcement-dialog-feed">
      {groups.map((group) => (
        <section
          key={group.key}
          className="announcement-date-group"
          aria-label={group.date ? dateFormatter.format(group.date) : t('states.unknownDate')}
        >
          <h3 className="announcement-date-group__date">
            {group.date ? (
              <time dateTime={group.key}>{dateFormatter.format(group.date)}</time>
            ) : (
              t('states.unknownDate')
            )}
          </h3>
          <div className="announcement-date-group__entries">
            {group.announcements.map((announcement) => {
              const key = getAnnouncementKey(announcement);
              const selected = key === selectedAnnouncementKey;
              const latest = announcement === announcements[0];
              const date = parseAnnouncementDate(announcement.timestamp);
              return (
                <article
                  key={key}
                  ref={selected ? selectedRef : undefined}
                  tabIndex={-1}
                  data-dialog-initial-focus={selected || undefined}
                  aria-label={
                    date
                      ? `${dateFormatter.format(date)} ${timeFormatter.format(date)}`
                      : announcement.timestamp
                  }
                  className={`announcement-dialog-entry${latest ? ' announcement-dialog-entry--latest' : ''}${selected ? ' announcement-dialog-entry--selected' : ''}`}
                >
                  <div className="announcement-dialog-entry__meta">
                    {date ? (
                      <time dateTime={date.toISOString()}>{timeFormatter.format(date)}</time>
                    ) : (
                      <span>{announcement.timestamp}</span>
                    )}
                    {latest ? (
                      <span className="announcement-dialog-entry__latest">{t('latest')}</span>
                    ) : null}
                  </div>
                  <AnnouncementBody content={announcement.content} />
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
