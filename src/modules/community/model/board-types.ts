export interface CommunityNotice {
  id: string;
  subject: string;
  relatedNoticeId: string | null;
  world: string;
  x: number;
  y: number;
  z: number;
  authorName: string;
  kind: 'notice' | 'objection';
  text: string;
  details?: {
    contact: string;
    scope: string;
    impact: string;
    proposal: string;
  } | null;
  status: 'open' | 'elapsed' | 'ruled' | 'withdrawn';
  createdAt: number;
  deadline: number;
  ruling: string | null;
}

export interface CommunityBoardResponse {
  notices: CommunityNotice[];
}

export function isCommunityBoardResponse(value: unknown): value is CommunityBoardResponse {
  if (!isObject(value) || !Array.isArray(value.notices)) return false;
  return value.notices.every(
    (entry: unknown) =>
      isObject(entry) &&
      typeof entry.id === 'string' &&
      typeof entry.subject === 'string' &&
      (entry.relatedNoticeId === null || typeof entry.relatedNoticeId === 'string') &&
      typeof entry.world === 'string' &&
      typeof entry.x === 'number' &&
      typeof entry.y === 'number' &&
      typeof entry.z === 'number' &&
      typeof entry.authorName === 'string' &&
      (entry.kind === 'notice' || entry.kind === 'objection') &&
      typeof entry.text === 'string' &&
      (entry.details === undefined ||
        entry.details === null ||
        (isObject(entry.details) &&
          typeof entry.details.contact === 'string' &&
          typeof entry.details.scope === 'string' &&
          typeof entry.details.impact === 'string' &&
          typeof entry.details.proposal === 'string')) &&
      (entry.status === 'open' ||
        entry.status === 'elapsed' ||
        entry.status === 'ruled' ||
        entry.status === 'withdrawn') &&
      typeof entry.createdAt === 'number' &&
      typeof entry.deadline === 'number' &&
      (entry.ruling === null || typeof entry.ruling === 'string'),
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
