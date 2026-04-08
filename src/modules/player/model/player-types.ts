export interface Player {
  name: string;
  uuid: string;
}

type ApiField<TKey extends string, TValue> = {
  [Key in TKey]: TValue;
};

export type OnlinePlayer = Player & ApiField<'joined_at', string>;

export interface PlayerOnlinePayload {
  online: number;
  players: OnlinePlayer[];
}

export type PlayersHistoryMeta = {
  from: string;
  to: string;
  interval: number | string;
} & ApiField<'total_points', number>;

export type PlayersHistorySummary = ApiField<'peak_online', number> &
  ApiField<'peak_time', string | null> &
  ApiField<'avg_online', number> &
  ApiField<'total_unique_players', number>;

export interface PlayersHistoryPoint {
  timestamp: string;
  online: number;
  players: string[];
}

export interface PlayersHistoryPayload {
  meta: PlayersHistoryMeta;
  summary: PlayersHistorySummary;
  data: PlayersHistoryPoint[];
}

export type PlayerSession = ApiField<'joined_at', string> &
  ApiField<'left_at', string | null> &
  Partial<ApiField<'duration_min', number>>;

export type PlayerHistoryStats = ApiField<'total_sessions', number> &
  ApiField<'total_hours', number> &
  ApiField<'first_seen', string | null>;

export interface PlayerHistoryPayload {
  uuid: string;
  name: string;
  sessions: PlayerSession[];
  stats: PlayerHistoryStats;
}

export interface PlayerContextValue {
  players: OnlinePlayer[];
  playerCount: number;
  isOnline: boolean;
  isLoading: boolean;
  networkError: boolean;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isHistoryIntervalValue(value: unknown): value is PlayersHistoryMeta['interval'] {
  return (
    (typeof value === 'number' && Number.isInteger(value) && value > 0) ||
    (typeof value === 'string' && value.length > 0)
  );
}

export function isPlayer(value: unknown): value is Player {
  return isObjectRecord(value) && typeof value.name === 'string' && typeof value.uuid === 'string';
}

export function isOnlinePlayer(value: unknown): value is OnlinePlayer {
  return isPlayer(value) && isObjectRecord(value) && typeof value.joined_at === 'string';
}

export function isPlayerOnlinePayload(value: unknown): value is PlayerOnlinePayload {
  return (
    isObjectRecord(value) &&
    typeof value.online === 'number' &&
    Array.isArray(value.players) &&
    value.players.every(isOnlinePlayer)
  );
}

export function isPlayersHistoryPayload(value: unknown): value is PlayersHistoryPayload {
  return (
    isObjectRecord(value) &&
    isObjectRecord(value.meta) &&
    typeof value.meta.from === 'string' &&
    typeof value.meta.to === 'string' &&
    isHistoryIntervalValue(value.meta.interval) &&
    typeof value.meta.total_points === 'number' &&
    isObjectRecord(value.summary) &&
    typeof value.summary.peak_online === 'number' &&
    (typeof value.summary.peak_time === 'string' || value.summary.peak_time === null) &&
    typeof value.summary.avg_online === 'number' &&
    typeof value.summary.total_unique_players === 'number' &&
    Array.isArray(value.data) &&
    value.data.every(
      (item) =>
        isObjectRecord(item) &&
        typeof item.timestamp === 'string' &&
        typeof item.online === 'number' &&
        isStringArray(item.players),
    )
  );
}

export function isPlayerHistoryPayload(value: unknown): value is PlayerHistoryPayload {
  return (
    isObjectRecord(value) &&
    typeof value.uuid === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.sessions) &&
    value.sessions.every(
      (session) =>
        isObjectRecord(session) &&
        typeof session.joined_at === 'string' &&
        (typeof session.left_at === 'string' || session.left_at === null) &&
        (session.duration_min === undefined || typeof session.duration_min === 'number'),
    ) &&
    isObjectRecord(value.stats) &&
    typeof value.stats.total_sessions === 'number' &&
    typeof value.stats.total_hours === 'number' &&
    (typeof value.stats.first_seen === 'string' || value.stats.first_seen === null)
  );
}
