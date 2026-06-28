import type { BuildType } from '@/modules/building/model/building-types';
import type { ResolvedPlayer } from '@/modules/building-submission/model/building-submission-types';

export const MAX_PENDING_BUILDING_SUBMISSIONS = 10;
export const MAX_BUILDING_SUBMISSION_IMAGES = 15;
export const MIN_BUILDING_SUBMISSION_IMAGE_WIDTH = 960;
export const MIN_BUILDING_SUBMISSION_IMAGE_HEIGHT = 540;

export interface BuilderDraft extends ResolvedPlayer {
  weight: number;
  locked?: boolean;
}

export interface BuildingSubmissionTagDraft {
  zh: string;
  en: string;
}

export interface BuildingSubmissionImageDraft {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  size: number;
}

export interface BuildingSubmissionFormState {
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  buildType: BuildType;
  x: string;
  y: string;
  z: string;
  buildDate: string;
  sourceAuthor: string;
  sourceLink: string;
  sourceNoteZh: string;
  sourceNoteEn: string;
}

export function createInitialBuildingSubmissionForm(): BuildingSubmissionFormState {
  return {
    nameZh: '',
    nameEn: '',
    descriptionZh: '',
    descriptionEn: '',
    buildType: 'original',
    x: '',
    y: '64',
    z: '',
    buildDate: new Date().toISOString().slice(0, 10),
    sourceAuthor: '',
    sourceLink: '',
    sourceNoteZh: '',
    sourceNoteEn: '',
  };
}

export function ensureSelfBuilder(
  current: BuilderDraft[],
  account: { currentName: string; playerUuid: string },
): BuilderDraft[] {
  const self = {
    uuid: account.playerUuid,
    name: account.currentName,
    weight: 1,
    locked: true,
  };
  const withoutSelf = current.filter((builder) => builder.uuid !== account.playerUuid);
  return [self, ...withoutSelf];
}

export function safeBuilderWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 1;
  return Math.max(1, Math.min(999, Math.round(weight)));
}

export function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b > 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

export function formatPercent(weight: number, totalWeight: number): string {
  if (totalWeight <= 0) return '0%';
  const percent = (weight / totalWeight) * 100;
  return `${percent >= 10 ? Math.round(percent) : percent.toFixed(1)}%`;
}
