import { z } from 'zod';
import type { MapWorld } from '@/modules/map/model/map-world';
import { mapWorldSchema } from '@/modules/map/model/map-world';

const responseSchema = z.object({ worlds: z.array(mapWorldSchema).max(256) });
const CACHE_MAX_AGE = 300_000;
let cached: { worlds: MapWorld[]; expiresAt: number } | null = null;
let request: Promise<MapWorld[]> | null = null;

/** Menus share in-flight requests and a five-minute catalog; failures remain retryable. */
export function loadMapWorlds() {
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.worlds);
  request ??= fetch('/api/map/worlds', { signal: AbortSignal.timeout(10_000) })
    .then(async (response) => {
      if (!response.ok) throw new Error('map_unavailable');
      const { worlds } = responseSchema.parse(await response.json());
      cached = { worlds, expiresAt: Date.now() + CACHE_MAX_AGE };
      return worlds;
    })
    .finally(() => {
      request = null;
    });
  return request;
}
