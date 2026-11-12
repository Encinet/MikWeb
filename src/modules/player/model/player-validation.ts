import type { PlayerIdentity } from '@/modules/player/model/player-types';
import { isRecord } from '@/shared/lib/is-record';

export function isPlayerIdentity(value: unknown): value is PlayerIdentity {
  return isRecord(value) && typeof value.name === 'string' && typeof value.uuid === 'string';
}
