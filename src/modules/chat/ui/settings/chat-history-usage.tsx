'use client';

import { ChevronDown } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { HistoryStorageReport } from '@/modules/chat/lib/history/chat-history-storage';

export function useHistoryFormat() {
  const format = useFormatter();
  const t = useTranslations('chat.data');
  return {
    bytes(value: number) {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const index = Math.min(4, Math.max(0, Math.floor(Math.log2(value || 1) / 10)));
      return `${format.number(value / 1024 ** index, { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`;
    },
    percent(value: number, total: number) {
      const ratio = total ? value / total : 0;
      const percent = format.number(ratio > 0 && ratio < 0.001 ? 0.001 : ratio, {
        style: 'percent',
        maximumFractionDigits: 1,
      });
      return ratio > 0 && ratio < 0.001 ? t('lessThanPercent', { percent }) : percent;
    },
  };
}

export function ChatHistoryUsage({
  report,
  storage,
  refresh,
}: {
  report: HistoryStorageReport;
  storage: StorageEstimate | null;
  refresh?: ReactNode;
}) {
  const t = useTranslations('chat');
  const format = useFormatter();
  const display = useHistoryFormat();
  const channels = (['public', 'private', 'staff'] as const).filter(
    (channel) => report.channels[channel].count > 0,
  );
  const quota = storage?.quota;
  const usage = storage?.usage;
  return (
    <div className="chat-storage-overview">
      <div className="chat-storage-total">
        <div>
          <span>{t('data.estimatedSize')}</span>
          <strong>{display.bytes(report.bytes)}</strong>
        </div>
        <div>
          <span>{t('data.summary', { count: report.count })}</span>
          {report.oldestAt !== null ? (
            <small>
              {t('data.oldest', {
                date: format.dateTime(report.oldestAt, { dateStyle: 'medium' }),
              })}
            </small>
          ) : null}
        </div>
        {refresh}
      </div>
      {channels.length ? (
        <>
          <div className="chat-storage-bar" aria-hidden="true">
            {channels.map((channel) => (
              <span
                key={channel}
                data-channel={channel}
                style={{ flexGrow: report.channels[channel].bytes }}
              />
            ))}
          </div>
          <dl className="chat-storage-breakdown" aria-label={t('data.channelUsage')}>
            {channels.map((channel) => {
              const value = report.channels[channel];
              return (
                <div key={channel}>
                  <dt>
                    <i data-channel={channel} aria-hidden="true" />
                    {t(`channels.${channel}`)}
                    <small>{t('data.messageCount', { count: value.count })}</small>
                  </dt>
                  <dd>
                    {display.bytes(value.bytes)}
                    <small>{display.percent(value.bytes, report.bytes)}</small>
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      ) : (
        <p>{t('data.empty')}</p>
      )}
      <p className="chat-storage-note">{t('data.sizeNote')}</p>
      {typeof quota === 'number' &&
      quota > 0 &&
      Number.isFinite(quota) &&
      typeof usage === 'number' &&
      usage >= 0 &&
      Number.isFinite(usage) ? (
        <details className="chat-storage-quota">
          <summary>
            <strong>{t('data.siteStorage')}</strong>
            <span>
              {t('data.siteUsage', {
                used: display.bytes(usage),
                quota: display.bytes(quota),
                percent: display.percent(usage, quota),
              })}
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <meter
            min={0}
            max={quota}
            value={Math.min(usage, quota)}
            aria-label={t('data.siteStorage')}
          />
          <small>{t('data.siteStorageNote')}</small>
        </details>
      ) : null}
    </div>
  );
}
