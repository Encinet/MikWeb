'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { getCommunityNoticeAnchor } from '@/modules/community/lib/community-notices';
import type { CommunityNotice } from '@/modules/community/model/board-types';

interface CommunityNoticeEntryProps {
  entry: CommunityNotice;
  expanded: boolean;
  locale: string;
  onToggle: () => void;
  onOpenRecord?: (id: string) => void;
}

export function CommunityNoticeEntry({
  entry,
  expanded,
  locale,
  onToggle,
  onOpenRecord,
}: CommunityNoticeEntryProps) {
  const t = useTranslations('communityBoard');
  const commonT = useTranslations('common');
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Singapore',
      }),
    [locale],
  );
  const formatTime = (value: number) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? formatter.format(date) : t('records.unknownTime');
  };
  const anchor = getCommunityNoticeAnchor(entry.id);
  const titleId = `${anchor}-title`;
  const contentId = `${anchor}-content`;

  const handleRecordLink = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (
      !onOpenRecord ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      window.location.hash !== `#${getCommunityNoticeAnchor(id)}`
    )
      return;
    event.preventDefault();
    onOpenRecord(id.toLowerCase());
  };

  return (
    <article id={anchor} tabIndex={-1} aria-labelledby={titleId} className="community-board__entry">
      <h2 id={titleId} className="community-board__entry-title">
        {entry.subject}
      </h2>
      <div className="community-board__entry-meta">
        <div className="community-board__entry-context">
          <span className="community-board__kind">{t(`kind.${entry.kind}`)}</span>
          <span>
            {entry.status === 'open'
              ? t(entry.kind === 'notice' ? 'status.noticeOpen' : 'status.objectionOpen')
              : t(`status.${entry.status}`)}
          </span>
        </div>
        <span>{t('records.by', { author: entry.authorName })}</span>
        {Number.isFinite(new Date(entry.createdAt).getTime()) ? (
          <time dateTime={new Date(entry.createdAt).toISOString()}>
            {formatTime(entry.createdAt)}
          </time>
        ) : (
          <span>{t('records.unknownTime')}</span>
        )}
        <span className="community-board__coordinate">
          <MapPin size={15} aria-hidden="true" />
          <span>
            {entry.world} {entry.x}, {entry.y}, {entry.z}
          </span>
        </span>
        {entry.kind === 'notice' ? (
          <span className="community-board__deadline">
            {t('records.noticeUntil', { time: formatTime(entry.deadline) })}
          </span>
        ) : null}
      </div>
      <div className="community-board__entry-body">
        {!expanded ? <p className="community-board__preview">{entry.text}</p> : null}
        <div id={contentId} className="community-board__entry-content" hidden={!expanded}>
          <p className="community-board__body">{entry.text}</p>
          {entry.details ? (
            <dl className="community-board__details">
              {(['contact', 'scope', 'impact', 'proposal'] as const)
                .filter((field) => Boolean(entry.details?.[field]?.trim()))
                .map((field) => (
                  <div key={field}>
                    <dt>{t(`detailLabels.${field}`)}</dt>
                    <dd>{entry.details?.[field]}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
          {entry.ruling ? (
            <section className="community-board__ruling">
              <h3>{t('ruling.title')}</h3>
              <p>{entry.ruling}</p>
            </section>
          ) : null}
          {entry.relatedNoticeId ? (
            <p className="community-board__related">
              <a
                href={`#${getCommunityNoticeAnchor(entry.relatedNoticeId)}`}
                onClick={(event) => handleRecordLink(event, entry.relatedNoticeId ?? '')}
              >
                {t('records.relatedNotice')}
              </a>
            </p>
          ) : null}
        </div>
      </div>
      <div className="community-board__entry-footer">
        <button
          type="button"
          className="community-board__expand"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={onToggle}
        >
          {expanded ? commonT('actions.collapseDetails') : t('records.expand')}
        </button>
        <a
          href={`#${anchor}`}
          onClick={(event) => handleRecordLink(event, entry.id)}
          aria-label={t('records.permalinkLabel', { subject: entry.subject })}
        >
          {t('records.permalink')}
        </a>
      </div>
    </article>
  );
}
