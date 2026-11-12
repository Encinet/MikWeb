import type { BuildingInput } from '@/modules/building/model/building-types';

export interface BuildingSubmissionImage {
  url: string;
  width: number;
  height: number;
  size: number;
  mime: 'image/webp';
}

export interface BuildingSubmission {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitterUuid: string;
  submitterName: string;
  submitterRole: string;
  payload: BuildingInput;
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
