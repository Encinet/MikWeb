import type {
  WikiLocale,
  WikiSectionDefinition,
  WikiSectionDocument,
  WikiSectionId,
} from '@/lib/types';
import { createWikiSectionGroups, sortWikiSections, WIKI_LOCALES } from '@/lib/wiki';
import { loadWikiSectionDocuments } from '@/lib/wikiContent';
import { parseWikiMarkdownBlocks } from '@/lib/wikiSearch';

function createWikiCheckError(title: string, details: string[], suggestion?: string): Error {
  return new Error(
    [title, ...details, suggestion ? `suggestion: ${suggestion}` : null].filter(Boolean).join('\n'),
  );
}

function validateNoDuplicateTopLevelHeading(
  locale: WikiLocale,
  wikiDocuments: WikiSectionDocument[],
): void {
  for (const wikiDocument of wikiDocuments) {
    const markdownBlocks = parseWikiMarkdownBlocks(wikiDocument.section.id, wikiDocument.content);
    const topLevelHeadingBlocks = markdownBlocks.filter(
      (markdownBlock) => markdownBlock.level === 1,
    );

    if (topLevelHeadingBlocks.length <= 1) {
      continue;
    }

    throw createWikiCheckError(
      'Wiki body must not contain an extra level-1 heading',
      [
        `locale: ${locale}`,
        `section: ${wikiDocument.section.id}`,
        `file: ${wikiDocument.sourcePath}`,
      ],
      'Remove the manual "# ..." heading from the markdown body and keep the title only in front matter.',
    );
  }
}

function validateSectionStructure(locale: WikiLocale, wikiDocuments: WikiSectionDocument[]): void {
  for (const wikiDocument of wikiDocuments) {
    const markdownBlocks = parseWikiMarkdownBlocks(wikiDocument.section.id, wikiDocument.content);
    const hasSecondLevelHeading = markdownBlocks.some((markdownBlock) => markdownBlock.level === 2);

    if (!hasSecondLevelHeading) {
      throw createWikiCheckError(
        'Wiki section must contain at least one level-2 heading',
        [
          `locale: ${locale}`,
          `section: ${wikiDocument.section.id}`,
          `file: ${wikiDocument.sourcePath}`,
        ],
        'Add at least one "##" subsection so the page outline and navigation remain useful.',
      );
    }
  }
}

function validateUniqueSectionOrder(
  locale: WikiLocale,
  wikiSections: WikiSectionDefinition[],
): void {
  const wikiSectionIdByOrder = new Map<number, WikiSectionId>();

  for (const wikiSection of wikiSections) {
    const existingSectionId = wikiSectionIdByOrder.get(wikiSection.order);
    if (!existingSectionId) {
      wikiSectionIdByOrder.set(wikiSection.order, wikiSection.id);
      continue;
    }

    throw createWikiCheckError(
      'Duplicate wiki section order',
      [
        `locale: ${locale}`,
        `order: ${wikiSection.order}`,
        `sections: ${existingSectionId}, ${wikiSection.id}`,
      ],
      'Give each section a unique "order" value in front matter.',
    );
  }
}

function validateLocaleParity(wikiSectionIdsByLocale: Map<WikiLocale, Set<WikiSectionId>>): void {
  const locales = Array.from(wikiSectionIdsByLocale.keys());
  const referenceLocale = locales[0];
  const referenceWikiSectionIds = wikiSectionIdsByLocale.get(referenceLocale);

  if (!referenceLocale || !referenceWikiSectionIds) return;

  for (const locale of locales.slice(1)) {
    const currentWikiSectionIds = wikiSectionIdsByLocale.get(locale);
    if (!currentWikiSectionIds) continue;

    const missingInCurrentLocale = Array.from(referenceWikiSectionIds).filter(
      (sectionId) => !currentWikiSectionIds.has(sectionId),
    );
    const extraInCurrentLocale = Array.from(currentWikiSectionIds).filter(
      (sectionId) => !referenceWikiSectionIds.has(sectionId),
    );

    if (missingInCurrentLocale.length === 0 && extraInCurrentLocale.length === 0) {
      continue;
    }

    const mismatchLines = [
      `Wiki locale parity mismatch between "${referenceLocale}" and "${locale}"`,
      missingInCurrentLocale.length > 0
        ? `missing in ${locale}: ${missingInCurrentLocale.join(', ')}`
        : null,
      extraInCurrentLocale.length > 0
        ? `missing in ${referenceLocale}: ${extraInCurrentLocale.join(', ')}`
        : null,
    ].filter((line): line is string => Boolean(line));

    throw createWikiCheckError(
      'Wiki locale parity mismatch',
      mismatchLines,
      'Ensure each section file exists in both locales with the same filename.',
    );
  }
}

function validateCrossLocaleSectionMetadata(
  wikiDocumentsByLocale: Map<WikiLocale, Map<WikiSectionId, WikiSectionDocument>>,
): void {
  const locales = Array.from(wikiDocumentsByLocale.keys());
  const referenceLocale = locales[0];
  const referenceDocumentsById = wikiDocumentsByLocale.get(referenceLocale);

  if (!referenceLocale || !referenceDocumentsById) return;

  for (const locale of locales.slice(1)) {
    const currentDocumentsById = wikiDocumentsByLocale.get(locale);
    if (!currentDocumentsById) continue;

    for (const [sectionId, referenceDocument] of referenceDocumentsById.entries()) {
      const currentDocument = currentDocumentsById.get(sectionId);
      if (!currentDocument) continue;

      const referenceSection = referenceDocument.section;
      const currentSection = currentDocument.section;

      const mismatchedFields = [
        referenceSection.groupId !== currentSection.groupId
          ? `group: ${referenceSection.groupId} vs ${currentSection.groupId}`
          : null,
        referenceSection.groupOrder !== currentSection.groupOrder
          ? `groupOrder: ${referenceSection.groupOrder} vs ${currentSection.groupOrder}`
          : null,
        referenceSection.order !== currentSection.order
          ? `order: ${referenceSection.order} vs ${currentSection.order}`
          : null,
        referenceSection.icon !== currentSection.icon
          ? `icon: ${referenceSection.icon} vs ${currentSection.icon}`
          : null,
      ].filter((field): field is string => Boolean(field));

      if (mismatchedFields.length === 0) {
        continue;
      }

      throw createWikiCheckError(
        'Cross-locale wiki metadata mismatch',
        [
          `section: ${sectionId}`,
          `reference locale: ${referenceLocale}`,
          `reference file: ${referenceDocument.sourcePath}`,
          `current locale: ${locale}`,
          `current file: ${currentDocument.sourcePath}`,
          ...mismatchedFields,
        ],
        'Keep group directory names, "_group.md" order, and section "order" / "icon" aligned across locales for the same section.',
      );
    }
  }
}

async function runWikiCheck(): Promise<void> {
  const wikiSectionIdsByLocale = new Map<WikiLocale, Set<WikiSectionId>>();
  const wikiDocumentsByLocale = new Map<WikiLocale, Map<WikiSectionId, WikiSectionDocument>>();

  for (const locale of WIKI_LOCALES) {
    const wikiDocuments = await loadWikiSectionDocuments(locale);
    const wikiSections = sortWikiSections(
      wikiDocuments.map((wikiDocument) => wikiDocument.section),
    );
    const wikiGroups = createWikiSectionGroups(wikiSections);
    const wikiSectionIdSet = new Set(wikiSections.map((wikiSection) => wikiSection.id));
    const wikiDocumentBySectionId = new Map(
      wikiDocuments.map((wikiDocument) => [wikiDocument.section.id, wikiDocument] as const),
    );

    validateNoDuplicateTopLevelHeading(locale, wikiDocuments);
    validateSectionStructure(locale, wikiDocuments);
    validateUniqueSectionOrder(locale, wikiSections);
    wikiSectionIdsByLocale.set(locale, wikiSectionIdSet);
    wikiDocumentsByLocale.set(locale, wikiDocumentBySectionId);

    console.log(
      `[wiki:check] ${locale}: ${wikiSections.length} sections across ${wikiGroups.length} groups`,
    );
  }

  validateLocaleParity(wikiSectionIdsByLocale);
  validateCrossLocaleSectionMetadata(wikiDocumentsByLocale);
}

runWikiCheck().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[wiki:check] failed\n${message}`);
  process.exitCode = 1;
});
