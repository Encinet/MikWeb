import type { Building } from '@/modules/building/model/building-types';
import type {
  BuilderDraft,
  BuildingSubmissionFormState,
  BuildingSubmissionTagDraft,
} from '@/modules/building-submission/model/building-submission-form';
import { safeBuilderWeight } from '@/modules/building-submission/model/building-submission-form';

export function buildBuildingSubmissionPayload(
  form: BuildingSubmissionFormState,
  builders: BuilderDraft[],
  tags: BuildingSubmissionTagDraft[],
  imageUrls: string[],
): Building {
  const required = [
    form.nameZh,
    form.nameEn,
    form.descriptionZh,
    form.descriptionEn,
    form.buildDate,
  ];
  if (required.some((value) => !value.trim())) throw new Error('required');
  if (!builders.length) throw new Error('buildersRequired');
  if (!imageUrls.length) throw new Error('imagesRequired');
  const coordinates = { x: Number(form.x), y: Number(form.y), z: Number(form.z) };
  if (
    !Number.isFinite(coordinates.x) ||
    !Number.isFinite(coordinates.y) ||
    !Number.isFinite(coordinates.z)
  ) {
    throw new Error('coordinatesRequired');
  }

  const source =
    form.buildType === 'original'
      ? null
      : buildRequiredSource({
          sourceAuthor: form.sourceAuthor,
          sourceLink: form.sourceLink,
          sourceNoteEn: form.sourceNoteEn,
          sourceNoteZh: form.sourceNoteZh,
        });

  return {
    name: { 'zh-CN': form.nameZh.trim(), en: form.nameEn.trim() },
    description: { 'zh-CN': form.descriptionZh.trim(), en: form.descriptionEn.trim() },
    coordinates,
    builders: builders.map((builder) => ({
      uuid: builder.uuid,
      name: builder.name,
      weight: safeBuilderWeight(builder.weight),
    })),
    buildType: form.buildType,
    images: imageUrls,
    buildDate: form.buildDate,
    tags: tags.map((tag) => ({ 'zh-CN': tag.zh, en: tag.en })),
    source,
  };
}

function buildRequiredSource({
  sourceAuthor,
  sourceLink,
  sourceNoteEn,
  sourceNoteZh,
}: {
  sourceAuthor: string;
  sourceLink: string;
  sourceNoteEn: string;
  sourceNoteZh: string;
}): NonNullable<Building['source']> {
  const originalAuthor = sourceAuthor.trim();
  const originalLink = sourceLink.trim();
  const zhNote = sourceNoteZh.trim();
  const enNote = sourceNoteEn.trim();

  if (!originalAuthor || !originalLink || !zhNote || !enNote) {
    throw new Error('sourceRequired');
  }

  return {
    originalAuthor,
    originalLink,
    notes: {
      'zh-CN': zhNote,
      en: enNote,
    },
  };
}
