import type { JoinCaptchaConfig } from '@/modules/join/model/join-captcha';

export const JOIN_GROUP_IDS = ['1', '2'] as const;

export type JoinGroupId = (typeof JOIN_GROUP_IDS)[number];

export interface JoinGroup {
  id: JoinGroupId;
  number: string | null;
  joinUrl: string;
}

export interface JoinPageData {
  groups: JoinGroup[];
  formUrl: string | null;
  captcha: JoinCaptchaConfig | null;
}

export function isJoinGroupId(value: unknown): value is JoinGroupId {
  return JOIN_GROUP_IDS.some((id) => id === value);
}
