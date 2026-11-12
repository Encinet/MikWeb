import type { CommunityNotice } from '@/modules/community/model/community-notice-types';

export const COMMUNITY_PAGE_SIZE = 12;

export function getLinkedCommunityNoticeId(hash: string): string | null {
  return (
    hash
      .match(/^#notice-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1]
      .toLowerCase() ?? null
  );
}

export function getCommunityNoticeAnchor(id: string): string {
  return `notice-${id.toLowerCase()}`;
}

export function filterCommunityNotices(
  entries: CommunityNotice[],
  query: string,
): CommunityNotice[] {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => {
      const searchable = [
        entry.subject,
        entry.text,
        entry.authorName,
        entry.world,
        entry.x,
        entry.y,
        entry.z,
        `${entry.x}, ${entry.y}, ${entry.z}`,
        entry.ruling ?? '',
        ...Object.values(entry.details ?? {}),
      ]
        .join(' ')
        .toLocaleLowerCase();
      return tokens.every((token) => searchable.includes(token));
    })
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function mergeCommunityNotices(
  entries: CommunityNotice[],
  linked?: CommunityNotice,
): CommunityNotice[] {
  const byId = new Map(entries.map((entry) => [entry.id.toLowerCase(), entry]));
  if (linked) byId.set(linked.id.toLowerCase(), linked);
  return filterCommunityNotices([...byId.values()], '');
}
