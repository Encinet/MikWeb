'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { getBanKey } from '@/modules/ban/lib/ban-catalog';
import type { BanItem } from '@/modules/ban/model/ban-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

interface BanRecordListProps {
  entries: BanItem[];
  locale: string;
  summary: string;
}

function BanDate({
  value,
  formatter,
  unknownLabel,
}: {
  value: string | null;
  formatter: Intl.DateTimeFormat;
  unknownLabel: string;
}) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(timestamp))
    return <span className="bans-record__unknown">{unknownLabel}</span>;
  const date = new Date(timestamp);
  return <time dateTime={date.toISOString()}>{formatter.format(date)}</time>;
}

export function BanRecordList({ entries, locale, summary }: BanRecordListProps) {
  const t = useTranslations('bans');
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  return (
    <table className="bans-table">
      <caption className="bans-table__summary">
        <span className="sr-only">{t('hero.title')} </span>
        <span role="status" aria-live="polite">
          {summary}
        </span>
      </caption>
      <thead>
        <tr>
          <th scope="col">{t('fields.player')}</th>
          <th scope="col">{t('fields.reason')}</th>
          <th scope="col">{t('fields.record')}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={getBanKey(entry)} className="bans-record">
            <th scope="row" className="bans-record__player">
              <div className="bans-player">
                <MinecraftAvatar
                  uuid={entry.playerUuid}
                  name={entry.playerName}
                  size={40}
                  className="bans-player__avatar"
                />
                <div className="bans-player__identity">
                  <span className="bans-player__name">{entry.playerName}</span>
                  <code className="bans-player__uuid">{entry.playerUuid}</code>
                </div>
              </div>
            </th>
            <td className="bans-record__reason">
              <span className="bans-record__mobile-label" aria-hidden="true">
                {t('fields.reason')}
              </span>
              <p>{entry.reason.trim() ? entry.reason : t('states.notProvided')}</p>
            </td>
            <td className="bans-record__details">
              <dl className="bans-record__metadata">
                <div className="bans-record__date">
                  <dt className="sr-only">{t('fields.bannedAt')}</dt>
                  <dd>
                    <BanDate
                      value={entry.bannedAt}
                      formatter={formatter}
                      unknownLabel={t('states.notProvided')}
                    />
                  </dd>
                </div>
                <div className="bans-record__operator">
                  <dt>{t('fields.bannedBy')}</dt>
                  <dd>{entry.bannedBy.trim() || t('states.notProvided')}</dd>
                </div>
              </dl>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
