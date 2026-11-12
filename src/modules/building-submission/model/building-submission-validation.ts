import { isBuildingId, isBuildingInput } from '@/modules/building/model/building-validation';
import type {
  BuildingSubmission,
  BuildingSubmissionCreateResponse,
  BuildingSubmissionImage,
  BuildingSubmissionListResponse,
} from '@/modules/building-submission/model/building-submission-types';
import { isRecord } from '@/shared/lib/is-record';

export function isBuildingSubmissionImage(value: unknown): value is BuildingSubmissionImage {
  return (
    isRecord(value) &&
    typeof value.url === 'string' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.size === 'number' &&
    value.mime === 'image/webp'
  );
}

export function isBuildingSubmission(value: unknown): value is BuildingSubmission {
  return (
    isRecord(value) &&
    isBuildingId(value.id) &&
    (value.status === 'pending' || value.status === 'approved' || value.status === 'rejected') &&
    typeof value.submitterUuid === 'string' &&
    typeof value.submitterName === 'string' &&
    typeof value.submitterRole === 'string' &&
    isBuildingInput(value.payload) &&
    Array.isArray(value.images) &&
    value.images.every(isBuildingSubmissionImage) &&
    (value.reviewer === undefined || typeof value.reviewer === 'string') &&
    (value.reviewNote === undefined || typeof value.reviewNote === 'string') &&
    (value.rejectedAt === undefined || typeof value.rejectedAt === 'string') &&
    (value.expiresAt === undefined || typeof value.expiresAt === 'string') &&
    (value.buildingId === undefined || isBuildingId(value.buildingId)) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export function isBuildingSubmissionListResponse(
  value: unknown,
): value is BuildingSubmissionListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.submissions) &&
    value.submissions.every(isBuildingSubmission)
  );
}

export function isBuildingSubmissionCreateResponse(
  value: unknown,
): value is BuildingSubmissionCreateResponse {
  return isRecord(value) && isBuildingSubmission(value.submission);
}
