'use client';

import { Search } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { HistoryPlayerUsage } from '@/modules/chat/lib/history/chat-history-storage';
import { useHistoryFormat } from '@/modules/chat/ui/settings/chat-history-usage';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

export function ChatHistoryPlayers({
  players,
  selected,
  onChange,
  totalBytes,
  disabled,
}: {
  players: HistoryPlayerUsage[];
  selected: readonly string[];
  onChange: (players: string[]) => void;
  totalBytes: number;
  disabled: boolean;
}) {
  const t = useTranslations('chat.data');
  const format = useFormatter();
  const display = useHistoryFormat();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('bytes');
  const [limit, setLimit] = useState(8);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return players
      .filter((player) => `${player.name} ${player.uuid}`.toLocaleLowerCase().includes(search))
      .sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name) || a.uuid.localeCompare(b.uuid)
          : (sort === 'recent'
              ? b.latestAt - a.latestAt
              : sort === 'count'
                ? b.count - a.count
                : b.bytes - a.bytes) || a.uuid.localeCompare(b.uuid),
      );
  }, [players, query, sort]);
  const allSelected =
    filtered.length > 0 && filtered.every((player) => selected.includes(player.uuid));
  return (
    <fieldset className="chat-history-players" disabled={disabled}>
      <legend className="sr-only">{t('players')}</legend>
      <div className="chat-player-tools">
        <label className="chat-player-search">
          <span className="sr-only">{t('searchPlayers')}</span>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder={t('searchPlayers')}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(8);
            }}
          />
        </label>
        <label>
          <span className="sr-only">{t('sortPlayers')}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="bytes">{t('sortBySize')}</option>
            <option value="count">{t('sortByCount')}</option>
            <option value="recent">{t('sortByRecent')}</option>
            <option value="name">{t('sortByName')}</option>
          </select>
        </label>
      </div>
      <div className="chat-player-selection">
        <span role="status">{t('selectedPlayers', { count: selected.length })}</span>
        <button
          type="button"
          className="chat-text-button"
          disabled={!filtered.length}
          onClick={() => {
            const visible = new Set(filtered.map((player) => player.uuid));
            onChange(
              allSelected
                ? selected.filter((uuid) => !visible.has(uuid))
                : [...new Set([...selected, ...visible])],
            );
          }}
        >
          {t(
            allSelected
              ? query.trim()
                ? 'deselectResults'
                : 'deselectAll'
              : query.trim()
                ? 'selectResults'
                : 'selectAll',
          )}
        </button>
        {selected.some((uuid) => !filtered.some((player) => player.uuid === uuid)) ? (
          <button type="button" className="chat-text-button" onClick={() => onChange([])}>
            {t('deselectAll')}
          </button>
        ) : null}
      </div>
      <div className="chat-player-records">
        {filtered.slice(0, limit).map((player) => (
          <label
            key={player.uuid}
            className="chat-player-record"
            data-selected={selected.includes(player.uuid)}
          >
            <input
              type="checkbox"
              checked={selected.includes(player.uuid)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, player.uuid]
                    : selected.filter((uuid) => uuid !== player.uuid),
                )
              }
            />
            <span className="chat-player-record__avatar" aria-hidden="true">
              <MinecraftAvatar uuid={player.uuid} name={player.name} size={32} />
            </span>
            <span className="chat-player-record__identity">
              <strong>{player.name}</strong>
              <small>
                {t('messageCount', { count: player.count })}
                <span aria-hidden="true"> · </span>
                <time
                  dateTime={new Date(player.latestAt).toISOString()}
                  title={t('playerLastMessage', {
                    date: format.dateTime(player.latestAt, { dateStyle: 'medium' }),
                  })}
                >
                  {format.dateTime(player.latestAt, { month: 'short', day: 'numeric' })}
                </time>
              </small>
              <span className="sr-only">{player.uuid}</span>
            </span>
            <span className="chat-player-record__usage">
              <strong>{display.bytes(player.bytes)}</strong>
              <small>{display.percent(player.bytes, totalBytes)}</small>
            </span>
          </label>
        ))}
        {!filtered.length ? (
          <p className="chat-player-empty">{t(players.length ? 'noPlayersFound' : 'noPlayers')}</p>
        ) : null}
      </div>
      {filtered.length > limit ? (
        <button
          type="button"
          className="chat-text-button"
          onClick={() => setLimit((value) => value + 16)}
        >
          {t('morePlayers', { count: filtered.length - limit })}
        </button>
      ) : null}
    </fieldset>
  );
}
