import type { BuildingType } from '@/modules/building/model/building-types';
import type { PlayerIdentity } from '@/modules/player/model/player-types';

export interface BuilderDraft extends PlayerIdentity {
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
  buildType: BuildingType;
  world: string;
  x: string;
  y: string;
  z: string;
  buildDate: string;
  sourceAuthor: string;
  sourceLink: string;
  sourceNoteZh: string;
  sourceNoteEn: string;
}

export function createInitialBuildingSubmissionForm(buildDate = ''): BuildingSubmissionFormState {
  return {
    nameZh: '',
    nameEn: '',
    descriptionZh: '',
    descriptionEn: '',
    buildType: 'original',
    world: 'world',
    x: '',
    y: '64',
    z: '',
    buildDate,
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

export function normalizeBuilderWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 1;
  return Math.max(1, Math.min(999, Math.round(weight)));
}

export function greatestCommonDivisor(left: number, right: number): number {
  let dividend = Math.abs(left);
  let divisor = Math.abs(right);
  while (divisor > 0) {
    const remainder = dividend % divisor;
    dividend = divisor;
    divisor = remainder;
  }
  return dividend;
}

export function formatBuilderContribution(weight: number, totalWeight: number): string {
  if (totalWeight <= 0) return '0%';
  const percent = (weight / totalWeight) * 100;
  return `${percent >= 10 ? Math.round(percent) : percent.toFixed(1)}%`;
}
