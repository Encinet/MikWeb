import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import type {
  WikiSectionDocument,
  WikiSectionFrontMatter,
  WikiSectionGroupId,
  WikiSectionIcon,
  WikiSectionId,
} from '@/modules/wiki/model/wiki-section-types';

export const SUPPORTED_WIKI_SECTION_ICONS = [
  'Home',
  'Wrench',
  'Shield',
  'Users',
  'Zap',
] as const satisfies readonly WikiSectionIcon[];

const DEFAULT_WIKI_SECTION_ICON: WikiSectionIcon = 'Home';
const DEFAULT_WIKI_ORDER_STEP = 10;
const DEFAULT_WIKI_ORDER_FALLBACK = 999;
const WIKI_GROUP_METADATA_FILENAME = '_group.md';
const wikiGroupFrontMatterSchema = z
  .object({
    label: z.string().trim().min(1),
    order: z.number().int().nonnegative(),
  })
  .strict();
const wikiSectionFrontMatterSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    order: z.number().int().nonnegative(),
    icon: z.enum(SUPPORTED_WIKI_SECTION_ICONS),
  })
  .strict();

interface WikiGroupMetadata {
  groupId: WikiSectionGroupId;
  groupLabel: string;
  groupOrder: number;
}

interface WikiSectionSource {
  id: WikiSectionId;
  sourceOrder: number;
  sourcePath: string;
  groupMetadata: WikiGroupMetadata;
}

export class WikiContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikiContentValidationError';
  }
}

function getWikiContentDirectory(locale: string): string {
  return path.join(process.cwd(), 'content', locale);
}

function deriveWikiSectionIdFromFilename(fileName: string): WikiSectionId {
  return fileName.replace(/\.md$/i, '');
}

async function readDirectoryEntriesSorted(directoryPath: string): Promise<Dirent[]> {
  const directoryEntries = await fs.readdir(directoryPath, { withFileTypes: true });
  return directoryEntries.sort((left, right) => left.name.localeCompare(right.name));
}

function parseFrontMatterScalar(rawValue: string): string | number {
  const trimmedValue = rawValue.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  if (/^-?\d+$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  return trimmedValue;
}

export function parseWikiFrontMatterBlock(rawSource: string): {
  attributes: Record<string, string | number>;
  body: string;
} {
  const normalizedSource = rawSource.replace(/\r\n?/g, '\n');
  const sourceLines = normalizedSource.split('\n');

  if (sourceLines[0]?.trim() !== '---') {
    return {
      attributes: {},
      body: normalizedSource.trim(),
    };
  }

  let closingDelimiterIndex = -1;

  for (let lineIndex = 1; lineIndex < sourceLines.length; lineIndex++) {
    if (sourceLines[lineIndex].trim() === '---') {
      closingDelimiterIndex = lineIndex;
      break;
    }
  }

  if (closingDelimiterIndex === -1) {
    return {
      attributes: {},
      body: normalizedSource.trim(),
    };
  }

  const frontMatterAttributes: Record<string, string | number> = {};

  for (const line of sourceLines.slice(1, closingDelimiterIndex)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const attributeMatch = trimmedLine.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!attributeMatch) continue;

    frontMatterAttributes[attributeMatch[1]] = parseFrontMatterScalar(attributeMatch[2] ?? '');
  }

  return {
    attributes: frontMatterAttributes,
    body: sourceLines
      .slice(closingDelimiterIndex + 1)
      .join('\n')
      .replace(/^\n+/, '')
      .trim(),
  };
}

function formatFrontMatterValidationError(
  sourcePath: string,
  validationError: z.ZodError,
  entityLabel: string,
): WikiContentValidationError {
  const details = validationError.issues
    .map((issue) => {
      const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'front matter';
      return `${fieldPath}: ${issue.message}`;
    })
    .join('\n');

  return new WikiContentValidationError(
    `Invalid ${entityLabel} front matter in ${sourcePath}\n${details}`,
  );
}

function parseWikiGroupMetadata({
  groupDirectoryPath,
  rawSource,
  sourcePath,
}: {
  groupDirectoryPath: string;
  rawSource: string;
  sourcePath: string;
}): WikiGroupMetadata {
  const wikiGroupId = path.basename(groupDirectoryPath);

  if (!wikiGroupId) {
    throw new WikiContentValidationError(
      `Invalid wiki group directory for ${sourcePath}\nsuggestion: Place ${WIKI_GROUP_METADATA_FILENAME} inside a group subdirectory, not directly under the locale root.`,
    );
  }

  const { attributes } = parseWikiFrontMatterBlock(rawSource);
  const parsedWikiGroupFrontMatterResult = wikiGroupFrontMatterSchema.safeParse({
    label: attributes.label,
    order: attributes.order,
  });

  if (!parsedWikiGroupFrontMatterResult.success) {
    throw formatFrontMatterValidationError(
      sourcePath,
      parsedWikiGroupFrontMatterResult.error,
      'wiki group',
    );
  }

  return {
    groupId: wikiGroupId,
    groupLabel: parsedWikiGroupFrontMatterResult.data.label,
    groupOrder: parsedWikiGroupFrontMatterResult.data.order,
  };
}

async function collectWikiSectionSourcesFromGroupDirectory({
  groupDirectoryPath,
  wikiSectionSources,
}: {
  groupDirectoryPath: string;
  wikiSectionSources: WikiSectionSource[];
}): Promise<void> {
  const groupDirectoryEntries = await readDirectoryEntriesSorted(groupDirectoryPath);
  const nestedGroupDirectoryEntries = groupDirectoryEntries.filter((directoryEntry) =>
    directoryEntry.isDirectory(),
  );

  if (nestedGroupDirectoryEntries.length > 0) {
    throw new WikiContentValidationError(
      [
        `Nested directories are not allowed in wiki group "${path.basename(groupDirectoryPath)}"`,
        `group directory: ${groupDirectoryPath}`,
        `nested directories: ${nestedGroupDirectoryEntries.map((directoryEntry) => directoryEntry.name).join(', ')}`,
        'suggestion: Keep the structure as content/<locale>/<group>/*.md.',
      ].join('\n'),
    );
  }

  const wikiGroupMetadataFileEntry = groupDirectoryEntries.find(
    (directoryEntry) =>
      directoryEntry.isFile() && directoryEntry.name === WIKI_GROUP_METADATA_FILENAME,
  );

  if (!wikiGroupMetadataFileEntry) {
    throw new WikiContentValidationError(
      [
        `Missing ${WIKI_GROUP_METADATA_FILENAME} in wiki group "${path.basename(groupDirectoryPath)}"`,
        `group directory: ${groupDirectoryPath}`,
        `suggestion: Add ${WIKI_GROUP_METADATA_FILENAME} with "label" and "order" front matter.`,
      ].join('\n'),
    );
  }

  const wikiGroupMetadataSourcePath = path.join(
    groupDirectoryPath,
    wikiGroupMetadataFileEntry.name,
  );
  const rawWikiGroupMetadataSource = await fs.readFile(wikiGroupMetadataSourcePath, 'utf-8');
  const wikiGroupMetadata = parseWikiGroupMetadata({
    groupDirectoryPath,
    rawSource: rawWikiGroupMetadataSource,
    sourcePath: wikiGroupMetadataSourcePath,
  });

  const wikiSectionFileEntries = groupDirectoryEntries.filter(
    (directoryEntry) =>
      directoryEntry.isFile() &&
      directoryEntry.name.endsWith('.md') &&
      directoryEntry.name !== WIKI_GROUP_METADATA_FILENAME,
  );

  if (wikiSectionFileEntries.length === 0) {
    throw new WikiContentValidationError(
      [
        `No wiki markdown files found in group "${wikiGroupMetadata.groupId}"`,
        `group directory: ${groupDirectoryPath}`,
        `suggestion: Add at least one markdown article alongside ${WIKI_GROUP_METADATA_FILENAME}.`,
      ].join('\n'),
    );
  }

  for (const wikiSectionFileEntry of wikiSectionFileEntries) {
    wikiSectionSources.push({
      id: deriveWikiSectionIdFromFilename(wikiSectionFileEntry.name),
      sourceOrder: wikiSectionSources.length,
      sourcePath: path.join(groupDirectoryPath, wikiSectionFileEntry.name),
      groupMetadata: wikiGroupMetadata,
    });
  }
}

async function discoverWikiSectionSources(locale: string): Promise<WikiSectionSource[]> {
  const contentDirectory = getWikiContentDirectory(locale);
  const localeRootEntries = await readDirectoryEntriesSorted(contentDirectory);
  const wikiSectionSources: WikiSectionSource[] = [];
  const localeRootSectionFileEntries = localeRootEntries.filter(
    (directoryEntry) => directoryEntry.isFile() && directoryEntry.name.endsWith('.md'),
  );

  if (localeRootSectionFileEntries.length > 0) {
    throw new WikiContentValidationError(
      [
        `Wiki locale root contains markdown files in ${contentDirectory}`,
        `files: ${localeRootSectionFileEntries.map((directoryEntry) => directoryEntry.name).join(', ')}`,
        'suggestion: Move article files into content/<locale>/<group>/ directories.',
      ].join('\n'),
    );
  }

  const wikiGroupDirectoryEntries = localeRootEntries.filter((directoryEntry) =>
    directoryEntry.isDirectory(),
  );

  for (const wikiGroupDirectoryEntry of wikiGroupDirectoryEntries) {
    await collectWikiSectionSourcesFromGroupDirectory({
      groupDirectoryPath: path.join(contentDirectory, wikiGroupDirectoryEntry.name),
      wikiSectionSources,
    });
  }

  return wikiSectionSources;
}

function validateUniqueSectionIds(locale: string, wikiSectionSources: WikiSectionSource[]): void {
  const sourcePathByWikiSectionId = new Map<WikiSectionId, string>();

  for (const wikiSectionSource of wikiSectionSources) {
    const existingSourcePath = sourcePathByWikiSectionId.get(wikiSectionSource.id);

    if (!existingSourcePath) {
      sourcePathByWikiSectionId.set(wikiSectionSource.id, wikiSectionSource.sourcePath);
      continue;
    }

    throw new WikiContentValidationError(
      [
        `Duplicate wiki section id in locale "${locale}"`,
        `section: ${wikiSectionSource.id}`,
        `first file: ${existingSourcePath}`,
        `current file: ${wikiSectionSource.sourcePath}`,
        'suggestion: Keep markdown filenames unique across all group directories in the same locale.',
      ].join('\n'),
    );
  }
}

export async function listWikiSectionIds(locale: string): Promise<WikiSectionId[]> {
  const wikiSectionSources = await discoverWikiSectionSources(locale);
  validateUniqueSectionIds(locale, wikiSectionSources);

  return wikiSectionSources
    .map((wikiSectionSource) => wikiSectionSource.id)
    .sort((left, right) => left.localeCompare(right));
}

export function parseWikiSectionDocument({
  groupMetadata,
  id,
  rawSource,
  sourceOrder,
  sourcePath,
}: {
  groupMetadata: WikiGroupMetadata;
  id: WikiSectionId;
  rawSource: string;
  sourceOrder?: number;
  sourcePath?: string;
}): WikiSectionDocument {
  const { attributes, body } = parseWikiFrontMatterBlock(rawSource);
  const fallbackWikiSectionOrder =
    typeof sourceOrder === 'number'
      ? (sourceOrder + 1) * DEFAULT_WIKI_ORDER_STEP
      : DEFAULT_WIKI_ORDER_FALLBACK;
  const parsedWikiSectionFrontMatterResult = wikiSectionFrontMatterSchema.safeParse({
    title: attributes.title,
    description: attributes.description,
    order: attributes.order ?? fallbackWikiSectionOrder,
    icon: attributes.icon ?? DEFAULT_WIKI_SECTION_ICON,
  });

  if (!parsedWikiSectionFrontMatterResult.success) {
    throw formatFrontMatterValidationError(
      sourcePath ?? `wiki section "${id}"`,
      parsedWikiSectionFrontMatterResult.error,
      'wiki section',
    );
  }

  const wikiSectionFrontMatter: WikiSectionFrontMatter = {
    title: parsedWikiSectionFrontMatterResult.data.title,
    description: parsedWikiSectionFrontMatterResult.data.description,
    order: parsedWikiSectionFrontMatterResult.data.order,
    icon: parsedWikiSectionFrontMatterResult.data.icon,
  };

  return {
    section: {
      id,
      icon: wikiSectionFrontMatter.icon,
      label: wikiSectionFrontMatter.title,
      description: wikiSectionFrontMatter.description,
      groupId: groupMetadata.groupId,
      groupLabel: groupMetadata.groupLabel,
      groupOrder: groupMetadata.groupOrder,
      order: wikiSectionFrontMatter.order,
    },
    content: [`# ${wikiSectionFrontMatter.title}`, body].filter(Boolean).join('\n\n'),
    sourcePath: sourcePath ?? `<wiki:${id}>`,
  };
}

export async function loadWikiSectionDocuments(locale: string): Promise<WikiSectionDocument[]> {
  const contentDirectory = getWikiContentDirectory(locale);
  const wikiSectionSources = await discoverWikiSectionSources(locale);

  if (wikiSectionSources.length === 0) {
    throw new WikiContentValidationError(`No wiki markdown files found in ${contentDirectory}`);
  }

  validateUniqueSectionIds(locale, wikiSectionSources);

  const wikiDocuments = await Promise.all(
    wikiSectionSources.map(async (wikiSectionSource) => {
      const rawWikiSectionSource = await fs.readFile(wikiSectionSource.sourcePath, 'utf-8');

      return parseWikiSectionDocument({
        groupMetadata: wikiSectionSource.groupMetadata,
        id: wikiSectionSource.id,
        rawSource: rawWikiSectionSource,
        sourceOrder: wikiSectionSource.sourceOrder,
        sourcePath: wikiSectionSource.sourcePath,
      });
    }),
  );

  return wikiDocuments;
}
