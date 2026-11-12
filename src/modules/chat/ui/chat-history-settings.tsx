'use client';

import { ChevronDown, HardDrive, RotateCw, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChatHistorySummary, HistoryCleanup } from '@/modules/chat/lib/chat-history';
import { readHistorySummary } from '@/modules/chat/lib/chat-history';
import type { useWebChat } from '@/modules/chat/model/use-web-chat';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';
import { Switch } from '@/shared/ui/switch';

export type ChatHistoryControls = Pick<
  ReturnType<typeof useWebChat>,
  | 'persist'
  | 'clearHistory'
  | 'clearMessages'
  | 'setPersistence'
  | 'storageFailed'
  | 'historyLease'
  | 'staff'
>;
type Confirmation =
  | { action: 'clear' | 'disable' }
  | { action: 'prune'; cleanup: HistoryCleanup; count: number };

export function ChatHistorySettings({ chat }: { chat: ChatHistoryControls }) {
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const format = useFormatter();
  const storageHelp = useId();
  const cleanupChannel = useId();
  const cleanupAge = useId();
  const previewId = useId();
  const descriptionId = useId();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [channel, setChannel] = useState<HistoryCleanup['channel']>('all');
  const [days, setDays] = useState(90);
  const [referenceTime, setReferenceTime] = useState(() => ({ now: Date.now() }));
  const [statistics, setStatistics] = useState<{
    cleanup: HistoryCleanup;
    epoch: string;
    value: ChatHistorySummary;
  } | null>(null);
  const [statisticsState, setStatisticsState] = useState<
    'loading' | 'ready' | 'failed' | 'unavailable'
  >('loading');
  const [cleaned, setCleaned] = useState(false);
  const managerSummary = useRef<HTMLElement>(null);
  useEffect(() => {
    if (cleaned && !confirmation) managerSummary.current?.focus();
  }, [cleaned, confirmation]);
  const [actionFailed, setActionFailed] = useState(false);
  const historyLease = chat.historyLease;
  useEffect(() => {
    if (!chat.staff && channel === 'staff') setChannel('all');
  }, [chat.staff, channel]);
  const cleanup = useMemo<HistoryCleanup>(
    () => ({
      channel,
      through: referenceTime.now - days * 86_400_000,
    }),
    [channel, days, referenceTime],
  );
  const summary =
    statistics?.cleanup === cleanup && statistics.epoch === historyLease?.epoch
      ? statistics.value
      : null;
  const totals = statistics?.epoch === historyLease?.epoch ? statistics?.value : null;
  useEffect(() => {
    if (!expanded) return;
    if (!historyLease?.owner) {
      setStatisticsState('unavailable');
      return;
    }
    let current = true;
    setStatisticsState('loading');
    void readHistorySummary(historyLease, cleanup)
      .then((value) => {
        if (!current) return;
        if (value) {
          setStatistics({ cleanup, epoch: historyLease.epoch, value });
          setStatisticsState('ready');
        } else setStatisticsState('unavailable');
      })
      .catch(() => {
        if (current) setStatisticsState('failed');
      });
    return () => {
      current = false;
    };
  }, [historyLease, cleanup, expanded]);
  const confirmAction = (value: Confirmation) => {
    setCleaned(false);
    setActionFailed(false);
    setConfirmation(value);
  };
  const updateHistory = async (value: Confirmation | { action: 'enable' }) => {
    if (busy) return;
    setBusy(true);
    setActionFailed(false);
    try {
      const success =
        value.action === 'clear'
          ? await chat.clearHistory()
          : value.action === 'prune'
            ? await chat.clearMessages(value.cleanup)
            : await chat.setPersistence(value.action === 'enable');
      if (success) {
        setConfirmation(null);
        setCleaned(value.action === 'clear' || value.action === 'prune');
      } else setActionFailed(true);
    } catch {
      setActionFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const title =
    confirmation?.action === 'prune'
      ? t('data.clearSelected')
      : confirmation?.action === 'disable'
        ? t('data.disableTitle')
        : t('clearHistory');
  return (
    <div className="chat-history-settings">
      <div className="ui-setting-row">
        <div className="ui-setting-row__label">
          <span>
            <HardDrive size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>{t('saveLocally')}</strong>
            <small id={storageHelp}>
              {historyLease ? t('serverHistoryNote') : t('data.unavailable')}
            </small>
          </div>
        </div>
        <Switch
          label={t('saveLocally')}
          checked={chat.persist}
          describedBy={storageHelp}
          disabled={busy || confirmation !== null || !historyLease}
          onChange={(persist) => {
            if (persist) void updateHistory({ action: 'enable' });
            else confirmAction({ action: 'disable' });
          }}
        />
      </div>
      <details
        className="chat-data-management"
        onToggle={(event) => {
          setExpanded(event.currentTarget.open);
          if (event.currentTarget.open) setReferenceTime({ now: Date.now() });
        }}
      >
        <summary ref={managerSummary} tabIndex={0}>
          <span>
            <strong>{t('data.title')}</strong>
          </span>
          <ChevronDown className="chat-data-toggle-icon" size={18} aria-hidden="true" />
        </summary>
        {expanded ? (
          <div className="chat-data-management__content">
            {statisticsState === 'failed' ? (
              <div className="chat-data-summary">
                <p role="alert">{t('data.statisticsFailed')}</p>
                <button
                  type="button"
                  className="ui-action-button"
                  onClick={() => setReferenceTime({ now: Date.now() })}
                >
                  {common('actions.retry')}
                </button>
              </div>
            ) : statisticsState === 'unavailable' ? (
              <p>{t('data.unavailable')}</p>
            ) : (
              <div className="chat-data-summary" aria-busy={statisticsState === 'loading'}>
                <div>
                  <p>
                    {totals
                      ? totals.total
                        ? t('data.summary', { count: totals.total })
                        : t('data.empty')
                      : t('data.loading')}
                  </p>
                  {totals?.oldestAt != null ? (
                    <small>
                      {t('data.oldest', {
                        date: format.dateTime(totals.oldestAt, { dateStyle: 'medium' }),
                      })}
                    </small>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ui-action-button"
                  disabled={statisticsState === 'loading'}
                  onClick={() => setReferenceTime({ now: Date.now() })}
                >
                  <RotateCw size={16} aria-hidden="true" />
                  {t('data.refresh')}
                </button>
              </div>
            )}
            {totals && totals.total > 0 && statisticsState !== 'unavailable' ? (
              <>
                <fieldset className="chat-data-filters" disabled={busy}>
                  <legend className="sr-only">{t('data.clearSelected')}</legend>
                  <label htmlFor={cleanupChannel}>
                    {t('data.messageType')}
                    <select
                      id={cleanupChannel}
                      name="history-channel"
                      value={channel}
                      onChange={(event) => {
                        setChannel(event.target.value as HistoryCleanup['channel']);
                        setCleaned(false);
                      }}
                    >
                      <option value="all">{t('data.allTypesOption')}</option>
                      <option value="public">{t('channels.public')}</option>
                      <option value="private">{t('channels.private')}</option>
                      {chat.staff ? <option value="staff">{t('channels.staff')}</option> : null}
                    </select>
                  </label>
                  <label htmlFor={cleanupAge}>
                    {t('data.timeRange')}
                    <select
                      id={cleanupAge}
                      name="history-age"
                      value={days}
                      onChange={(event) => {
                        setDays(Number(event.target.value));
                        setCleaned(false);
                      }}
                    >
                      {[30, 90, 365].map((days) => (
                        <option key={days} value={days}>
                          {t('data.olderThan', { days })}
                        </option>
                      ))}
                      <option value={0}>{t('data.allDates')}</option>
                    </select>
                  </label>
                </fieldset>
                {statisticsState !== 'failed' ? (
                  <div className="chat-data-preview">
                    <p id={previewId} role="status" aria-atomic="true">
                      {summary
                        ? summary.matching
                          ? t('data.matching', { count: summary.matching })
                          : t('data.noMatches')
                        : t('data.loading')}
                    </p>
                    <button
                      type="button"
                      className="ui-action-button"
                      disabled={!summary?.matching || statisticsState !== 'ready' || busy}
                      aria-describedby={previewId}
                      onClick={() =>
                        confirmAction({
                          action: 'prune',
                          cleanup: { ...cleanup },
                          count: summary?.matching ?? 0,
                        })
                      }
                    >
                      {t('data.reviewCleanup')}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="chat-data-reset">
              <button
                type="button"
                className="ui-action-button ui-action-button--danger"
                disabled={busy || !historyLease}
                onClick={() => confirmAction({ action: 'clear' })}
              >
                {t('data.resetAction')}
              </button>
            </div>
          </div>
        ) : null}
      </details>
      {cleaned ? (
        <p className="ui-inline-message" role="status">
          {t('data.cleaned')}
        </p>
      ) : null}
      {!confirmation && (chat.storageFailed || actionFailed) ? (
        <p className="ui-inline-message" role="alert">
          {t('storageFailed')}
        </p>
      ) : null}
      <AppDialog
        isOpen={confirmation !== null}
        onClose={() => setConfirmation(null)}
        dismissible={!busy}
        title={title}
        icon={<Trash2 size={18} />}
        descriptionId={descriptionId}
        className="chat-dialog chat-cleanup-dialog"
      >
        {confirmation ? (
          <div className="chat-settings-confirm">
            <p id={descriptionId}>
              {confirmation.action === 'prune'
                ? t('data.confirm', {
                    count: confirmation.count,
                    scope:
                      confirmation.cleanup.channel === 'all'
                        ? t('data.allTypes')
                        : t(`channels.${confirmation.cleanup.channel}`),
                    date: format.dateTime(confirmation.cleanup.through, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })
                : t(confirmation.action === 'disable' ? 'disableHistoryConfirm' : 'clearConfirm')}
            </p>
            {actionFailed ? <p role="alert">{t('data.cleanupFailed')}</p> : null}
            <div>
              <button
                type="button"
                className="ui-action-button"
                data-dialog-initial-focus
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                {common('actions.cancel')}
              </button>
              <button
                type="button"
                className="ui-action-button ui-action-button--danger"
                disabled={busy}
                onClick={() => void updateHistory(confirmation)}
              >
                {busy
                  ? t('data.clearing')
                  : t(
                      confirmation.action === 'prune'
                        ? 'data.confirmAction'
                        : confirmation.action === 'disable'
                          ? 'data.confirmDisable'
                          : 'confirmClear',
                    )}
              </button>
            </div>
          </div>
        ) : null}
      </AppDialog>
    </div>
  );
}
