import 'server-only';

import { cacheLife } from 'next/cache';
import type { WikiAccess, WikiLocale } from '@/modules/wiki/model/wiki-section-types';
import { createWikiContentBundle } from '@/modules/wiki/server/create-wiki-content-bundle';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';

/** Repository content is deployment-scoped. Authorization always runs before reading staff data. */
export async function getWikiContent(locale: WikiLocale, audience: WikiAccess = 'public') {
  // MDX files are read from disk, outside the module graph watched by HMR.
  if (process.env.NODE_ENV === 'development') return readWikiContent(locale, audience);
  return getCachedWikiContent(locale, audience);
}

async function getCachedWikiContent(locale: WikiLocale, audience: WikiAccess) {
  'use cache';
  cacheLife('max');
  return readWikiContent(locale, audience);
}

async function readWikiContent(locale: WikiLocale, audience: WikiAccess) {
  return createWikiContentBundle(locale, await loadWikiSectionDocuments(locale, audience));
}
