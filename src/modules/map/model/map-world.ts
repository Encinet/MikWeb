import { z } from 'zod';
import { MAP_ORIGIN } from '@/shared/config/service-config';

const mapWorldSchema = z.object({
  name: z.string().min(1).max(128),
  displayName: z.string().max(128),
  type: z.string().max(64),
});
export const mapWorldsSchema = z.array(mapWorldSchema).max(256);
export type MapWorld = z.infer<typeof mapWorldSchema>;
export type MapWorldHint =
  | { kind: 'name'; name: string }
  | { kind: 'dimension'; dimension: 'overworld' | 'the_nether' | 'the_end' };

const dimensionAliases = { overworld: 'overworld', the_nether: 'nether', the_end: 'end' } as const;

/** Resolve only an exact catalog name or an unambiguous, known dimension. */
export function coordinateMapWorld(
  worlds: readonly MapWorld[],
  hint: MapWorldHint | null,
): string | null {
  if (!hint) return null;
  const alias = hint.kind === 'dimension' ? dimensionAliases[hint.dimension] : null;
  let match: string | null = null;
  for (const world of worlds) {
    const matches =
      hint.kind === 'name'
        ? world.name === hint.name
        : world.type === hint.dimension || world.type === alias;
    if (!matches) continue;
    if (match !== null) return null;
    match = world.name;
  }
  return match;
}

/** Pl3xMap reads these query parameters directly; never infer a world name from a dimension. */
export function mapPositionUrl(world: string, x: number, z: number): string {
  const url = new URL(MAP_ORIGIN);
  url.search = new URLSearchParams({ world, zoom: '3', x: String(x), z: String(z) }).toString();
  return url.href;
}
