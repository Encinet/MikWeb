import { isBuildingId } from '@/modules/building/model/building-validation';
import type {
  BuildingSubmissionCreateResponse,
  BuildingSubmissionListResponse,
  BuildingSubmissionSummary,
} from '@/modules/building-submission/model/building-submission-types';
import { isLocalizedText } from '@/shared/i18n/localized-text';
import { isRecord } from '@/shared/lib/is-record';

const SUBMISSION_FIELDS = new Set<string>([
  'id',
  'name',
  'status',
  'reviewNote',
  'expiresAt',
] satisfies (keyof BuildingSubmissionSummary)[]);

function isBuildingSubmissionSummary(value: unknown): value is BuildingSubmissionSummary {
  return (
    isRecord(value) &&
    isBuildingId(value.id) &&
    Object.keys(value).every((field) => SUBMISSION_FIELDS.has(field)) &&
    isLocalizedText(value.name) &&
    (value.status === 'pending' || value.status === 'approved' || value.status === 'rejected') &&
    (value.reviewNote === undefined || typeof value.reviewNote === 'string') &&
    (value.expiresAt === undefined ||
      (typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt))))
  );
}

export function isBuildingSubmissionListResponse(
  value: unknown,
): value is BuildingSubmissionListResponse {
  return (
    isRecord(value) &&
    typeof value.playerUuid === 'string' &&
    Array.isArray(value.submissions) &&
    value.submissions.every(isBuildingSubmissionSummary)
  );
}

export function isBuildingSubmissionCreateResponse(
  value: unknown,
): value is BuildingSubmissionCreateResponse {
  return (
    isRecord(value) &&
    typeof value.playerUuid === 'string' &&
    isBuildingSubmissionSummary(value.submission)
  );
}
