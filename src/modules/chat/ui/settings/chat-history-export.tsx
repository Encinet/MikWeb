'use client';

import { Download } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import type { HistoryCleanup, HistoryLease } from '@/modules/chat/lib/history/chat-history';
import type { HistoryExportFormat } from '@/modules/chat/lib/history/chat-history-export';
import { exportChatHistory } from '@/modules/chat/lib/history/chat-history-export';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

interface ExportScope {
  selection: HistoryCleanup;
  count: number;
  names: string[];
}
interface PreparedFile {
  url: string;
  filename: string;
  count: number;
}

function downloadFile(file: PreparedFile) {
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
}

export function ChatHistoryExport({
  lease,
  staff,
  active,
  disabled,
  total,
  filtered,
}: {
  lease: HistoryLease | null;
  staff: boolean;
  active: boolean;
  disabled: boolean;
  total: number;
  filtered: ExportScope;
}) {
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const format = useFormatter();
  const id = useId();
  const [session, setSession] = useState<{ all: ExportScope; filtered: ExportScope } | null>(null);
  const [range, setRange] = useState<'all' | 'filtered'>('all');
  const [fileFormat, setFileFormat] = useState<HistoryExportFormat>('json');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<'export.empty' | 'export.changed' | 'export.failed' | null>(
    null,
  );
  const [file, setFile] = useState<PreparedFile | null>(null);
  const job = useRef<AbortController | null>(null);
  const prepared = useRef<PreparedFile | null>(null);
  const clearFile = () => {
    if (prepared.current) URL.revokeObjectURL(prepared.current.url);
    prepared.current = null;
    setFile(null);
    setError(null);
  };
  const close = () => {
    job.current?.abort();
    job.current = null;
    setBusy(false);
    clearFile();
    setSession(null);
  };
  useEffect(() => {
    return () => {
      job.current?.abort();
      job.current = null;
      if (prepared.current) URL.revokeObjectURL(prepared.current.url);
      prepared.current = null;
    };
  }, []);
  const selected = session?.[range];
  const scopeLabel = (scope: ExportScope) => [
    scope.selection.channel === 'all'
      ? t('data.allTypes')
      : t(`channels.${scope.selection.channel}`),
    scope.selection.through === Number.MAX_SAFE_INTEGER
      ? t('data.allDates')
      : t('export.through', {
          date: format.dateTime(scope.selection.through, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        }),
    scope.selection.players
      ? t('data.confirmPlayers', {
          count: scope.selection.players.length,
          names: format.list(scope.names),
        })
      : t('data.everyone'),
  ];
  const start = async () => {
    if (!lease || !selected || job.current) return;
    const controller = new AbortController();
    job.current = controller;
    clearFile();
    setBusy(true);
    setProgress(0);
    try {
      const result = await exportChatHistory({
        lease,
        staff,
        selection: selected.selection,
        format: fileFormat,
        signal: controller.signal,
        text: {
          header: `${t('title')}\n${t('export.account', { owner: lease.owner ?? '' })}\n${scopeLabel(selected).join('\n')}`,
          labels: {
            channels: {
              public: t('channels.public'),
              private: t('channels.private'),
              staff: t('channels.staff'),
            },
            sources: { game: t('source.game'), web: t('source.web') },
            server: t('server.label'),
            you: t('you'),
            date: (time) =>
              format.dateTime(time, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short',
              }),
            activity: (content) => t(`server.${content.template}`, content.values),
          },
        },
        onProgress: (count) => {
          if (job.current === controller && !controller.signal.aborted) setProgress(count);
        },
      });
      if (controller.signal.aborted || job.current !== controller) return;
      const value = {
        url: URL.createObjectURL(result.blob),
        filename: result.filename,
        count: result.count,
      };
      prepared.current = value;
      setFile(value);
      downloadFile(value);
    } catch (error) {
      if (!controller.signal.aborted && job.current === controller)
        setError(
          error instanceof Error && error.message === 'history_export_empty'
            ? 'export.empty'
            : error instanceof Error && error.message === 'history_export_changed'
              ? 'export.changed'
              : 'export.failed',
        );
    } finally {
      if (job.current === controller) {
        job.current = null;
        setBusy(false);
      }
    }
  };
  return (
    <>
      <button
        type="button"
        className="ui-action-button"
        disabled={disabled || !active || !lease?.persist || !total}
        onClick={() => {
          clearFile();
          setRange('all');
          setSession({
            all: {
              selection: { channel: 'all', through: Number.MAX_SAFE_INTEGER },
              count: total,
              names: [],
            },
            filtered: {
              ...filtered,
              names: [...filtered.names],
              selection: {
                ...filtered.selection,
                ...(filtered.selection.players ? { players: [...filtered.selection.players] } : {}),
              },
            },
          });
        }}
      >
        <Download size={16} aria-hidden="true" />
        {t('export.open')}
      </button>
      <AppDialog
        isOpen={session !== null}
        onClose={close}
        title={t('export.title')}
        icon={<Download size={18} />}
        descriptionId={`${id}-description`}
        className="chat-dialog chat-export-dialog"
      >
        {selected ? (
          <div className="chat-history-export">
            <p id={`${id}-description`}>{t('export.help')}</p>
            <fieldset className="chat-data-filters" disabled={busy}>
              <legend className="sr-only">{t('export.options')}</legend>
              <label htmlFor={`${id}-range`}>
                {t('export.range')}
                <select
                  id={`${id}-range`}
                  value={range}
                  onChange={(event) => {
                    clearFile();
                    setRange(event.target.value as 'all' | 'filtered');
                  }}
                >
                  <option value="all">{t('data.allRecords')}</option>
                  <option value="filtered" disabled={!session?.filtered.count}>
                    {t('export.filtered')}
                  </option>
                </select>
              </label>
              <label htmlFor={`${id}-format`}>
                {t('export.format')}
                <select
                  id={`${id}-format`}
                  value={fileFormat}
                  onChange={(event) => {
                    clearFile();
                    setFileFormat(event.target.value as HistoryExportFormat);
                  }}
                >
                  <option value="json">{t('export.json')}</option>
                  <option value="txt">{t('export.txt')}</option>
                </select>
              </label>
            </fieldset>
            <div className="chat-export-scope">
              <strong>{t('export.count', { count: selected.count })}</strong>
              {scopeLabel(selected).map((label) => (
                <p key={label}>{label}</p>
              ))}
            </div>
            <div role="status" aria-atomic="true">
              {busy ? (
                <p>{t('export.preparing', { count: progress })}</p>
              ) : file ? (
                <p>{t('export.ready', { count: file.count })}</p>
              ) : null}
            </div>
            {error ? <p role="alert">{t(error)}</p> : null}
            <div className="chat-export-actions">
              <button
                type="button"
                className="ui-action-button"
                data-dialog-initial-focus
                onClick={close}
              >
                {common(file ? 'actions.close' : 'actions.cancel')}
              </button>
              <button
                type="button"
                className="ui-action-button ui-action-button--primary"
                disabled={busy || !selected.count}
                onClick={() => {
                  if (file) downloadFile(file);
                  else void start();
                }}
              >
                {file ? t('export.download') : busy ? t('export.working') : t('export.action')}
              </button>
            </div>
          </div>
        ) : null}
      </AppDialog>
    </>
  );
}
