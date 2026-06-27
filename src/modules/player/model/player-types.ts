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
  // biome-ignore lint/style/useNamingConvention: API returns snake_case
  peak_online?: number;
  players: OnlinePlayer[];

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
