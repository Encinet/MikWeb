import type { BuildingInput } from '@/modules/building/model/building-types';

export interface BuildingSubmissionSummary {
  id: string;
  name: BuildingInput['name'];
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  expiresAt?: string;
}

export interface BuildingSubmissionListResponse {
  playerUuid: string;
  submissions: BuildingSubmissionSummary[];
}

export interface BuildingSubmissionCreateResponse {
  playerUuid: string;
  submission: BuildingSubmissionSummary;
}
