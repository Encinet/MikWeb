import 'server-only';

import { cacheLife } from 'next/cache';
import { buildWikiSearchIndex } from '@/modules/wiki/lib/wiki-search';
import type { WikiLocale } from '@/modules/wiki/model/wiki-section-types';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';

// A search-only request needs the public Markdown, without compiling any React articles.
export function getPublicWikiSearchIndex(locale: WikiLocale) {
  if (process.env.NODE_ENV === 'development') return readPublicWikiSearchIndex(locale);
  return getCachedPublicWikiSearchIndex(locale);
}

async function getCachedPublicWikiSearchIndex(locale: WikiLocale) {
  'use cache';
  cacheLife('max');
  return readPublicWikiSearchIndex(locale);
}

async function readPublicWikiSearchIndex(locale: WikiLocale) {
  const documents = await loadWikiSectionDocuments(locale, 'public');
  const content = Object.fromEntries(
    documents.map(({ section, content }) => [section.id, content]),
  );
  return buildWikiSearchIndex(locale, content);
}
