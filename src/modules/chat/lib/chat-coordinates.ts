export interface ChatCoordinates {
  start: number;
  end: number;
  label: string;
  x: number;
  y: number;
  z: number;
  world: MapWorldHint | null;
}

const number = '[+-]?\\d{1,8}(?:\\.\\d{1,3})?';
const axes = `(?<x>${number})\\s*[,，]\\s*(?<y>${number})\\s*[,，]\\s*(?<z>${number})`;
const spaced = `(?<x>${number})\\s+(?<y>${number})\\s+(?<z>${number})`;
const world =
  '(?<world>minecraft:overworld|minecraft:the_nether|minecraft:the_end|world_nether|world_the_end|overworld|the_nether|the_end|nether|world|end|主世界|下界|地狱|末地)';
const prefix = `(?:${world}(?:\\s*[:：]\\s*|\\s+))?`;
const customWorld = '(?:世界|world)\\s*[:=：]\\s*(?<worldName>[\\p{L}\\p{N}_-]{1,64})';
const patterns = [
  `${customWorld}\\s+${axes}`,
  `${customWorld}\\s+${spaced}`,
  `${prefix}[xX]\\s*[:=：]\\s*(?<x>${number})[,，\\s]+[yY]\\s*[:=：]\\s*(?<y>${number})[,，\\s]+[zZ]\\s*[:=：]\\s*(?<z>${number})`,
  `${prefix}[([{（【]\\s*${spaced}\\s*[)\\]}）】]`,
  `${prefix}[([{（【]?\\s*${axes}\\s*[)\\]}）】]?`,
  `${world}(?:\\s*[:：]\\s*|\\s+)${spaced}`,
  `(?:/tp(?:\\s+@s)?|坐标|coordinates?|coords?)\\s*[:：]?\\s+${spaced}`,
  `^\\s*${spaced}\\s*$`,
].map((pattern) => new RegExp(`(?<![\\w.+-])${pattern}(?![\\d.])`, 'giu'));

function normalizeWorld(value?: string): MapWorldHint | null {
  if (!value) return null;
  if (/^(?:world|overworld|minecraft:overworld|主世界)$/i.test(value))
    return { kind: 'dimension', dimension: 'overworld' };
  if (/^(?:world_nether|the_nether|minecraft:the_nether|nether|下界|地狱)$/i.test(value))
    return { kind: 'dimension', dimension: 'the_nether' };
  return { kind: 'dimension', dimension: 'the_end' };
}

/** Only explicit coordinate notation is interactive; ordinary numbers and links remain text. */
export function findChatCoordinates(text: string): ChatCoordinates[] {
  const found: ChatCoordinates[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const groups = match.groups;
      if (!groups) continue;
      const [x, y, z] = [groups.x, groups.y, groups.z].map(Number);
      if (
        [x, y, z].some(
          (coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) > 30_000_000,
        )
      )
        continue;
      const start = match.index;
      const end = start + match[0].length;
      if (found.some((coordinate) => coordinate.start < end && coordinate.end > start)) continue;
      found.push({
        start,
        end,
        label: match[0],
        x,
        y,
        z,
        world: groups.worldName
          ? { kind: 'name', name: groups.worldName }
          : normalizeWorld(groups.world),
      });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

import type { MapWorldHint } from '@/modules/map/model/map-world';
