import { z } from 'zod';

export const MAP_URL = 'https://map.mcmik.top';
export const mapWorldSchema = z.object({
  name: z.string().min(1).max(128),
  displayName: z.string().max(128),
  type: z.string().max(64),
});
export type MapWorld = z.infer<typeof mapWorldSchema>;
export type MapWorldHint =
  | { kind: 'name'; name: string }
  | { kind: 'dimension'; dimension: 'overworld' | 'the_nether' | 'the_end' };

/** Resolve only an exact catalog name or an unambiguous, known dimension. */
export function coordinateMapWorld(
  worlds: readonly MapWorld[],
  hint: MapWorldHint | null,
): string | null {
  if (!hint) return null;
  const matching = worlds.filter((world) => {
    if (hint.kind === 'name') return world.name === hint.name;
    const alias =
      hint.dimension === 'the_nether'
        ? 'nether'
        : hint.dimension === 'the_end'
          ? 'end'
          : 'overworld';
    return world.type === hint.dimension || world.type === alias;
  });
  return matching.length === 1 ? matching[0].name : null;
}

/** Pl3xMap reads these query parameters directly; never infer a world name from a dimension. */
export function mapPositionUrl(world: string, x: number, z: number): string {
  const url = new URL(MAP_URL);
  url.search = new URLSearchParams({ world, zoom: '3', x: String(x), z: String(z) }).toString();
  return url.href;
}
