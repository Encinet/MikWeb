import type { PlayerIdentity, PlayerStatus } from '@/modules/player/model/player-types';
import { isPlayerIdentity } from '@/modules/player/model/player-validation';
import { isRecord } from '@/shared/lib/is-record';

/** The data service's wire format is converted before it reaches application state. */
export interface PlayerStatusResponse {
  online: number;
  // biome-ignore lint/style/useNamingConvention: External data service field.
  peak_online?: number;
  players: Array<
    PlayerIdentity & {
      // biome-ignore lint/style/useNamingConvention: External data service field.
      joined_at: string;
    }
  >;
}

export function isPlayerStatusResponse(value: unknown): value is PlayerStatusResponse {
  return (
    isRecord(value) &&
    typeof value.online === 'number' &&
    Number.isSafeInteger(value.online) &&
    value.online >= -1 &&
    (value.peak_online === undefined ||
      (typeof value.peak_online === 'number' &&
        Number.isSafeInteger(value.peak_online) &&
        value.peak_online >= -1)) &&
    Array.isArray(value.players) &&
    value.players.every(
      (player) =>
        isRecord(player) && isPlayerIdentity(player) && typeof player.joined_at === 'string',
    )
  );
}

export function toPlayerStatus(response: PlayerStatusResponse): PlayerStatus {
  return {
    online: response.online,
    // Mik Data's status fallback uses -1 when the plugin cannot supply the peak.
    peakOnline: response.peak_online === -1 ? undefined : response.peak_online,
    players: response.players.map((player) => ({
      name: player.name,
      uuid: player.uuid,
      joinedAt: player.joined_at,
    })),
  };
}
