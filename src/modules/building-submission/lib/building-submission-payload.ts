import type { BuildingInput } from '@/modules/building/model/building-types';
import { isBuildingDate, isBuildingSource, isWorldName } from '@/modules/building/model/building-validation';
import type {
  BuilderDraft,
  BuildingSubmissionFormState,
  BuildingSubmissionTagDraft,
} from '@/modules/building-submission/model/building-submission-form';
import { normalizeBuilderWeight } from '@/modules/building-submission/model/building-submission-form';
import {
  BUILDING_SUBMISSION_TEXT_LIMITS as textLimits,
  MAX_BUILDING_SUBMISSION_BUILDERS,
} from '@/modules/building-submission/model/building-submission-limits';

export function buildBuildingSubmissionDetails(
  form: BuildingSubmissionFormState,
  builders: BuilderDraft[],
  tags: BuildingSubmissionTagDraft[],
): Omit<BuildingInput, 'images'> {
  const name = { 'zh-CN': form.nameZh.trim(), en: form.nameEn.trim() };
  const description = { 'zh-CN': form.descriptionZh.trim(), en: form.descriptionEn.trim() };
  if (!name['zh-CN'] || !name.en || !description['zh-CN'] || !description.en)
    throw new Error('required');
  if (
    Object.values(name).some((text) => text.length > textLimits.name) ||
    Object.values(description).some((text) => text.length > textLimits.description)
  ) throw new Error('invalid');
  if (!isBuildingDate(form.buildDate)) throw new Error('dateInvalid');
  if (!builders.length) throw new Error('buildersRequired');
  if (builders.length > MAX_BUILDING_SUBMISSION_BUILDERS) throw new Error('buildersLimit');
  const coordinates = {
    world: form.world.trim(),
    x: Number(form.x),
    y: Number(form.y),
    z: Number(form.z),
  };
  if (
    !isWorldName(coordinates.world) ||
    !form.x.trim() ||
    !form.y.trim() ||
    !form.z.trim() ||
    !Number.isFinite(coordinates.x) ||
    !Number.isFinite(coordinates.y) ||
    !Number.isFinite(coordinates.z)
  ) {
    throw new Error('coordinatesRequired');
  }

  const originalAuthor = form.sourceAuthor.trim();
  const originalLink = form.sourceLink.trim();
  const notes = { 'zh-CN': form.sourceNoteZh.trim(), en: form.sourceNoteEn.trim() };
  const hasNotes = Boolean(notes['zh-CN'] || notes.en);
  const source = originalAuthor || originalLink || hasNotes
    ? {
        originalAuthor: originalAuthor || undefined,
        originalLink: originalLink || undefined,
        notes: hasNotes ? notes : undefined,
      }
    : undefined;
  if (
    originalAuthor.length > textLimits.sourceAuthor ||
    originalLink.length > textLimits.sourceLink ||
    Object.values(notes).some((text) => text.length > textLimits.sourceNote) ||
    (source !== undefined && !isBuildingSource(source))
  ) throw new Error('sourceInvalid');

  return {
    name,
    description,
    coordinates,
    builders: builders.map((builder) => ({
      uuid: builder.uuid,
      name: builder.name,
      weight: normalizeBuilderWeight(builder.weight),
    })),
    buildType: form.buildType,
    buildDate: form.buildDate,
    tags: tags.length ? tags.map((tag) => ({ 'zh-CN': tag.zh, en: tag.en })) : undefined,
    source,
  };
}
