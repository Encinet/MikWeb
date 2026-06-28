import type { Building } from '@/modules/building/model/building-types';
import { isBuilding } from '@/modules/building/model/building-types';

export interface BuildingSubmissionImage {
  url: string;
  displayUrl?: string;
  width: number;
  height: number;
  size: number;
  mime: 'image/webp';
}

export interface ResolvedPlayer {
  uuid: string;
  name: string;
}

export interface BuildingSubmission {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitterUuid: string;
  submitterName: string;
  submitterRole: string;
  payload: Building;
  images: BuildingSubmissionImage[];
  reviewer?: string;
  reviewNote?: string;
  rejectedAt?: string;
  expiresAt?: string;
  buildingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingSubmissionListResponse {
  submissions: BuildingSubmission[];
}

export interface BuildingSubmissionCreateResponse {
  submission: BuildingSubmission;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isResolvedPlayer(value: unknown): value is ResolvedPlayer {
  return isObjectRecord(value) && typeof value.uuid === 'string' && typeof value.name === 'string';
}

export function isBuildingSubmissionImage(value: unknown): value is BuildingSubmissionImage {
  return (
    isObjectRecord(value) &&
    typeof value.url === 'string' &&
    (value.displayUrl === undefined || typeof value.displayUrl === 'string') &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.size === 'number' &&
    value.mime === 'image/webp'
  );
}

export function isBuildingSubmission(value: unknown): value is BuildingSubmission {
  return (
    isObjectRecord(value) &&
    typeof value.id === 'string' &&
    (value.status === 'pending' || value.status === 'approved' || value.status === 'rejected') &&
    typeof value.submitterUuid === 'string' &&
    typeof value.submitterName === 'string' &&
    typeof value.submitterRole === 'string' &&
    isBuilding(value.payload) &&
    Array.isArray(value.images) &&
    value.images.every(isBuildingSubmissionImage) &&
    (value.reviewer === undefined || typeof value.reviewer === 'string') &&
    (value.reviewNote === undefined || typeof value.reviewNote === 'string') &&
    (value.rejectedAt === undefined || typeof value.rejectedAt === 'string') &&
    (value.expiresAt === undefined || typeof value.expiresAt === 'string') &&
    (value.buildingId === undefined || typeof value.buildingId === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export function isBuildingSubmissionListResponse(
  value: unknown,
): value is BuildingSubmissionListResponse {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.submissions) &&
    value.submissions.every(isBuildingSubmission)
  );
}
