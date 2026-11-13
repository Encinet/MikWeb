'use client';

import { HardDrive, RotateCw, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { HistoryCleanup } from '@/modules/chat/lib/history/chat-history';
import { onHistoryChange } from '@/modules/chat/lib/history/chat-history';
import type {
  HistoryAge,
  HistoryStorageReport,
} from '@/modules/chat/lib/history/chat-history-storage';
import {
  readHistoryStorageReport,
  selectHistoryUsage,
} from '@/modules/chat/lib/history/chat-history-storage';
import type { useWebChat } from '@/modules/chat/model/use-web-chat';
import { ChatHistoryExport } from '@/modules/chat/ui/settings/chat-history-export';
import { ChatHistoryPlayers } from '@/modules/chat/ui/settings/chat-history-players';
import { ChatHistoryUsage, useHistoryFormat } from '@/modules/chat/ui/settings/chat-history-usage';
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
  | { action: 'prune'; cleanup: HistoryCleanup; count: number; bytes: number; players: string[] };

export function ChatHistorySettings({
  chat,
  active = true,
}: {
  chat: ChatHistoryControls;
  active?: boolean;
}) {
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const format = useFormatter();
  const display = useHistoryFormat();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [channel, setChannel] = useState<HistoryCleanup['channel']>('all');
  const [days, setDays] = useState<HistoryAge>(90);
  const [scope, setScope] = useState<'all' | 'players'>('all');
  const [players, setPlayers] = useState<string[]>([]);
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  const [statistics, setStatistics] = useState<{
    owner: string | null;
    epoch: string;
    staff: boolean;
    time: number;
    value: HistoryStorageReport;
    storage: StorageEstimate | null;
  } | null>(null);
  const [statisticsState, setStatisticsState] = useState<
    'loading' | 'ready' | 'failed' | 'unavailable'
  >('loading');
  const [cleaned, setCleaned] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const managerHeading = useRef<HTMLHeadingElement>(null);
  const historyLease = chat.historyLease;
  useEffect(() => {
    if (cleaned && !confirmation) managerHeading.current?.focus();
  }, [cleaned, confirmation]);
  useEffect(() => {
    if (!chat.staff && channel === 'staff') setChannel('all');
  }, [chat.staff, channel]);
  useEffect(() => {
    if (active) setReferenceTime(Date.now());
  }, [active]);
  useEffect(() => {
    if (!active) return;
    // Read-position signals do not change storage statistics.
    return onHistoryChange((reading) => {
      if (!reading) setReferenceTime(Date.now());
    });
  }, [active]);
  const cleanup = useMemo<HistoryCleanup>(
    () => ({
      channel,
      through: referenceTime - days * 86_400_000,
      ...(scope === 'players' ? { players: [...players] } : {}),
    }),
    [channel, days, players, scope, referenceTime],
  );
  const report =
    statistics &&
    statistics.epoch === historyLease?.epoch &&
    statistics.owner === historyLease?.owner &&
    statistics.staff === chat.staff &&
    statistics.time === referenceTime
      ? statistics.value
      : null;
  const matching = report ? selectHistoryUsage(report, channel, days, cleanup.players) : null;
  useEffect(() => {
    if (!active) return;
    if (!historyLease?.owner) {
      setStatisticsState('unavailable');
      return;
    }
    const controller = new AbortController();
    setStatisticsState('loading');
    let estimate: StorageEstimate | null = null;
    void Promise.resolve()
      .then(() => navigator.storage?.estimate?.() ?? null)
      .then((storage) => {
        if (controller.signal.aborted) return;
        estimate = storage;
        setStatistics((previous) =>
          previous?.epoch === historyLease.epoch &&
          previous.owner === historyLease.owner &&
          previous.time === referenceTime
            ? { ...previous, storage }
            : previous,
        );
      })
      .catch(() => {
        /* Site-wide estimates are optional; local records remain manageable. */
      });
    void readHistoryStorageReport(historyLease, referenceTime, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        if (value) {
          setStatistics({
            owner: historyLease.owner,
            epoch: historyLease.epoch,
            staff: chat.staff,
            time: referenceTime,
            value,
            storage: estimate,
          });
          setStatisticsState('ready');
        } else setStatisticsState('unavailable');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatisticsState('failed');
      });
    return () => controller.abort();
  }, [historyLease, active, referenceTime, chat.staff]);
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
        setReferenceTime(Date.now());
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
  const refresh = (
    <button
      type="button"
      className="chat-icon-button"
      aria-label={t('data.refresh')}
      title={t('data.refresh')}
      disabled={statisticsState === 'loading' || busy || !historyLease}
      onClick={() => setReferenceTime(Date.now())}
    >
      <RotateCw size={16} aria-hidden="true" />
    </button>
  );
  return (
    <div className="chat-history-settings">
      <header className="chat-settings-heading">
        <h3 ref={managerHeading} tabIndex={-1}>
          {t('settingsSections.history')}
        </h3>
      </header>
      <div className="ui-setting-row">
        <div className="ui-setting-row__label">
          <span>
            <HardDrive size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>{t('saveLocally')}</strong>
            <small id={`${id}-storage`}>
              {historyLease ? t('serverHistoryNote') : t('data.unavailable')}
            </small>
          </div>
        </div>
        <Switch
          label={t('saveLocally')}
          checked={chat.persist}
          describedBy={`${id}-storage`}
          disabled={busy || confirmation !== null || !historyLease}
          onChange={(persist) => {
            if (persist) void updateHistory({ action: 'enable' });
            else confirmAction({ action: 'disable' });
          }}
        />
      </div>
      <div className="chat-data-management__content" aria-busy={statisticsState === 'loading'}>
        {statisticsState === 'failed' ? (
          <div className="chat-data-summary">
            <p role="alert">{t('data.statisticsFailed')}</p>
            <button
              type="button"
              className="ui-action-button"
              onClick={() => setReferenceTime(Date.now())}
            >
              {common('actions.retry')}
            </button>
          </div>
        ) : statisticsState === 'unavailable' ? (
          <p role="status">{t('data.unavailable')}</p>
        ) : report ? (
          <ChatHistoryUsage
            report={report}
            storage={statistics?.storage ?? null}
            refresh={refresh}
          />
        ) : (
          <p role="status">{t('data.loading')}</p>
        )}
        {report && report.count > 0 ? (
          <div className="chat-data-cleanup">
            <fieldset className="chat-data-filters" disabled={busy}>
              <legend className="sr-only">{t('data.clearSelected')}</legend>
              <label htmlFor={`${id}-channel`}>
                {t('data.messageType')}
                <select
                  id={`${id}-channel`}
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
              <label htmlFor={`${id}-age`}>
                {t('data.timeRange')}
                <select
                  id={`${id}-age`}
                  name="history-age"
                  value={days}
                  onChange={(event) => {
                    setDays(Number(event.target.value) as HistoryAge);
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
            <fieldset className="chat-data-scope" disabled={busy}>
              <legend className="sr-only">{t('data.playerScope')}</legend>
              <label>
                <input
                  type="radio"
                  name={`${id}-scope`}
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => {
                    setScope('all');
                    setCleaned(false);
                  }}
                />
                {t('data.allRecords')}
              </label>
              <label>
                <input
                  type="radio"
                  name={`${id}-scope`}
                  value="players"
                  checked={scope === 'players'}
                  onChange={() => {
                    setScope('players');
                    setCleaned(false);
                  }}
                />
                {t('data.choosePlayers')}
              </label>
            </fieldset>
            {scope === 'players' ? (
              <ChatHistoryPlayers
                players={report.players}
                selected={players}
                totalBytes={report.bytes}
                disabled={busy}
                onChange={(players) => {
                  setPlayers(players);
                  setCleaned(false);
                }}
              />
            ) : null}
            <div className="chat-data-preview">
              <div id={`${id}-preview`} role="status" aria-atomic="true">
                <strong>
                  {matching?.count
                    ? t('data.matching', { count: matching.count })
                    : t(
                        scope === 'players' && !players.length
                          ? 'data.choosePlayersFirst'
                          : 'data.noMatches',
                      )}
                </strong>
                {matching && matching.count > 0 ? (
                  <small>
                    {t('data.cleanupSize', {
                      size: display.bytes(matching.bytes),
                      percent: display.percent(matching.bytes, report.bytes),
                    })}
                  </small>
                ) : null}
              </div>
              <button
                type="button"
                className="ui-action-button"
                disabled={!matching?.count || statisticsState !== 'ready' || busy}
                aria-describedby={`${id}-preview`}
                onClick={() =>
                  confirmAction({
                    action: 'prune',
                    cleanup: {
                      ...cleanup,
                      ...(cleanup.players ? { players: [...cleanup.players] } : {}),
                    },
                    count: matching?.count ?? 0,
                    bytes: matching?.bytes ?? 0,
                    players: report.players
                      .filter((player) => players.includes(player.uuid))
                      .map((player) => player.name),
                  })
                }
              >
                {t('data.reviewCleanup')}
              </button>
            </div>
          </div>
        ) : null}
        <div className="chat-data-reset">
          {/* Reset the export session when its account, permission, or settings context changes. */}
          <ChatHistoryExport
            key={`${historyLease?.owner}:${historyLease?.epoch}:${chat.staff}:${active}`}
            lease={historyLease}
            staff={chat.staff}
            active={active}
            disabled={busy || confirmation !== null || statisticsState !== 'ready'}
            total={report?.count ?? 0}
            filtered={{
              selection: cleanup,
              count: matching?.count ?? 0,
              names:
                report?.players
                  .filter((player) => players.includes(player.uuid))
                  .map((player) => player.name) ?? [],
            }}
          />
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
        descriptionId={`${id}-description`}
        className="chat-dialog chat-cleanup-dialog"
      >
        {confirmation ? (
          <div className="chat-settings-confirm">
            <p id={`${id}-description`}>
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
            {confirmation.action === 'prune' ? (
              <div className="chat-cleanup-scope">
                <strong>
                  {t('data.estimatedSize')}: {display.bytes(confirmation.bytes)}
                </strong>
                {confirmation.cleanup.players ? (
                  <>
                    <p>
                      {t('data.confirmPlayers', {
                        count: confirmation.cleanup.players.length,
                        names: confirmation.players.join('、'),
                      })}
                    </p>
                    <p>{t('data.playersHelp')}</p>
                  </>
                ) : (
                  <p>{t('data.everyone')}</p>
                )}
                <p>{t('data.cleanupHelp')}</p>
              </div>
            ) : null}
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
