import type {
  WikiLocale,
  WikiSectionDefinition,
  WikiSectionGroupDefinition,
  WikiSectionGroupId,
} from '@/lib/types';

export const WIKI_LOCALES = ['zh-CN', 'en'] as const satisfies readonly WikiLocale[];

export function isWikiLocale(value: string): value is WikiLocale {
  return WIKI_LOCALES.some((locale) => locale === value);
}

export function sortWikiSections(sections: WikiSectionDefinition[]): WikiSectionDefinition[] {
  return [...sections].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.id.localeCompare(right.id);
  });
}

export function createWikiSectionGroups(
  sections: WikiSectionDefinition[],
): WikiSectionGroupDefinition[] {
  const groupsById = new Map<
    WikiSectionGroupId,
    {
      id: WikiSectionGroupId;
      label: string;
      order: number;
      sections: WikiSectionDefinition[];
    }
  >();

  for (const sectionDefinition of sections) {
    const existingGroupEntry = groupsById.get(sectionDefinition.groupId);

    if (existingGroupEntry) {
      existingGroupEntry.sections.push(sectionDefinition);
      if (sectionDefinition.groupOrder < existingGroupEntry.order) {
        existingGroupEntry.order = sectionDefinition.groupOrder;
      }
      continue;
    }

    groupsById.set(sectionDefinition.groupId, {
      id: sectionDefinition.groupId,
      label: sectionDefinition.groupLabel,
      order: sectionDefinition.groupOrder,
      sections: [sectionDefinition],
    });
  }

  return Array.from(groupsById.values())
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.label.localeCompare(right.label);
    })
    .map(({ id, label, sections: groupedSections }) => ({
      id,
      label,
      sections: sortWikiSections(groupedSections),
    }));
}
