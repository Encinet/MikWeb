export interface PlayerIdentity {
  name: string;
  uuid: string;
}

export interface Player extends PlayerIdentity {
  // biome-ignore lint/style/useNamingConvention: External player API uses snake_case.
  joined_at: string;
}

export interface PlayerOnlinePayload {
  online: number;
  // biome-ignore lint/style/useNamingConvention: External player API uses snake_case.
  peak_online?: number;
  players: Player[];
}

export interface PlayerContextValue {
  players: Player[];
  playerCount: number;
  peakPlayerCount: number | null;
  isOnline: boolean;
  isLoading: boolean;
  networkError: boolean;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isPlayerIdentity(value: unknown): value is PlayerIdentity {
  return isObjectRecord(value) && typeof value.name === 'string' && typeof value.uuid === 'string';
}

export function isPlayer(value: unknown): value is Player {
  return isPlayerIdentity(value) && isObjectRecord(value) && typeof value.joined_at === 'string';
}

export function isPlayerOnlinePayload(value: unknown): value is PlayerOnlinePayload {
  return (
    isObjectRecord(value) &&
    typeof value.online === 'number' &&
    (value.peak_online === undefined || typeof value.peak_online === 'number') &&
    Array.isArray(value.players) &&
    value.players.every(isPlayer)
  );
}
