import 'server-only';

import { z } from 'zod';
import { MAP_URL, mapWorldSchema } from '@/modules/map/model/map-world';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';

const settingsSchema = z.object({ worldSettings: z.array(mapWorldSchema).max(256) });

export async function getMapWorlds() {
  const response = await fetch(`${MAP_URL}/tiles/settings.json`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error('map_unavailable');
  }

  const body = await readLimitedResponse(response, 256_000);
  return settingsSchema.parse(JSON.parse(new TextDecoder().decode(body))).worldSettings;
}
