import type { CommunityBoardResponse } from '@/modules/community/model/community-notice-types';
import { isRecord } from '@/shared/lib/is-record';

export function isCommunityBoardResponse(value: unknown): value is CommunityBoardResponse {
  if (!isRecord(value) || !Array.isArray(value.notices)) return false;
  return value.notices.every(
    (entry: unknown) =>
      isRecord(entry) &&
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
        (isRecord(entry.details) &&
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
