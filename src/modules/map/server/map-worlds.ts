import 'server-only';

import { z } from 'zod';
import { MAP_URL, mapWorldSchema } from '@/modules/map/model/map-world';

const settingsSchema = z.object({ worldSettings: z.array(mapWorldSchema).max(256) });

export async function getMapWorlds() {
  // A transient gateway failure should not require the user to reopen the coordinate menu.
  // Both attempts fit inside the client's ten-second request budget.
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${MAP_URL}/tiles/settings.json`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(3500),
      });
    } catch (error) {
      if (attempt === 0) continue;
      throw error;
    }
    if (response.status >= 500 && attempt === 0) continue;
    if (!response.ok) throw new Error('map_unavailable');
    const text = await response.text();
    if (text.length > 256_000) throw new Error('invalid_map_settings');
    return settingsSchema.parse(JSON.parse(text)).worldSettings;
  }
  throw new Error('map_unavailable');
}
