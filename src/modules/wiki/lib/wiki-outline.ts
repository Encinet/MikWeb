import type { WikiSectionOutlineItem } from '@/modules/wiki/model/wiki-section-types';

export interface WikiOutlineGroup {
  item: WikiSectionOutlineItem;
  children: WikiSectionOutlineItem[];
}

export interface WikiHeadingPosition {
  slug: string;
  top: number;
}

export interface WikiReadingAnchor {
  slug: string;
  progress: number;
}

export function captureWikiReadingAnchor(
  headings: WikiHeadingPosition[],
  readingLine: number,
  articleBottom: number,
): WikiReadingAnchor | null {
  if (!headings.length || readingLine < headings[0].top || readingLine >= articleBottom)
    return null;
  const index = headings.findLastIndex((heading) => heading.top <= readingLine);
  const start = headings[index];
  const end = headings[index + 1]?.top ?? articleBottom;
  return {
    slug: start.slug,
    progress: end > start.top ? (readingLine - start.top) / (end - start.top) : 0,
  };
}

export function resolveWikiReadingAnchor(
  headings: WikiHeadingPosition[],
  anchor: WikiReadingAnchor,
  articleBottom: number,
): number | undefined {
  const index = headings.findIndex((heading) => heading.slug === anchor.slug);
  if (index < 0) return undefined;
  const start = headings[index].top;
  const end = headings[index + 1]?.top ?? articleBottom;
  return start + (end - start) * anchor.progress;
}

export function groupWikiOutline(items: WikiSectionOutlineItem[]): WikiOutlineGroup[] {
  const groups: WikiOutlineGroup[] = [];
  for (const item of items) {
    const parent = groups.at(-1);
    if (parent && item.level > parent.item.level) parent.children.push(item);
    else groups.push({ item, children: [] });
  }
  return groups;
}

export function getActiveWikiSlug(
  headings: WikiHeadingPosition[],
  readingLine: number,
  atDocumentEnd = false,
): string {
  if (atDocumentEnd) return headings.at(-1)?.slug ?? '';
  let activeSlug = '';
  for (const heading of headings) {
    if (heading.top > readingLine) break;
    activeSlug = heading.slug;
  }
  return activeSlug;
}

export function decodeWikiHash(hash: string): string {
  const value = hash.replace(/^#/, '');
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getWikiSectionHref(sectionId: string, slug = ''): string {
  const params = new URLSearchParams({ section: sectionId });
  return `?${params}${slug ? `#${encodeURIComponent(slug)}` : ''}`;
}

export function pushWikiHistory(
  history: Pick<History, 'state' | 'replaceState' | 'pushState'>,
  currentHref: string,
  nextHref: string,
  scrollY: number,
): void {
  if (new URL(nextHref, currentHref).href === currentHref) return;
  const state = history.state && typeof history.state === 'object' ? history.state : {};
  history.replaceState({ ...state, mikWikiScrollY: scrollY }, '', currentHref);
  history.pushState({ ...state, mikWikiScrollY: null }, '', nextHref);
}

export function getWikiHistoryScroll(state: unknown): number | undefined {
  if (!state || typeof state !== 'object' || !('mikWikiScrollY' in state)) return undefined;
  const value = state.mikWikiScrollY;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}
