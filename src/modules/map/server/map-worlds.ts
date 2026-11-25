import 'server-only';

import { z } from 'zod';
import { mapWorldsSchema } from '@/modules/map/model/map-world';
import { MAP_ORIGIN } from '@/shared/config/service-config';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';

const settingsSchema = z.object({ worldSettings: mapWorldsSchema });

export async function getMapWorlds() {
  const response = await fetch(`${MAP_ORIGIN}/tiles/settings.json`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    throw new Error('map_unavailable');
  }

  const body = await readLimitedResponse(response, 256_000);
  return settingsSchema.parse(JSON.parse(new TextDecoder().decode(body))).worldSettings;
}
