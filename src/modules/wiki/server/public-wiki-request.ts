import 'server-only';

import type { WikiSectionPayload } from '@/modules/wiki/model/wiki-content-types';
import type { SearchableWikiBlock, WikiSearchEntry } from '@/modules/wiki/model/wiki-search-types';
import { isWikiSectionId } from '@/modules/wiki/server/public-wiki-paths';
import { getPublicWikiSearchIndex } from '@/modules/wiki/server/public-wiki-search-index';
import { getWikiContent } from '@/modules/wiki/server/wiki-content';
import { isRoutingLocale } from '@/shared/i18n/routing';

// Server caching is deployment-scoped. Revalidate browser responses after a deployment.
const publicHeaders = { 'Cache-Control': 'public, max-age=0, must-revalidate' };

export async function wikiSectionResponse(locale: string, id: string) {
  if (!isRoutingLocale(locale) || !isWikiSectionId(id)) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  // Never infer the audience from cookies, claims, or the requested section name.
  const bundle = await getWikiContent(locale, 'public');
  if (!bundle.sections.some((section) => section.id === id && section.access === 'public')) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  return Response.json(
    {
      id,
      article: bundle.articles[id],
      outline: bundle.outlines[id],
    } satisfies WikiSectionPayload,
    { headers: publicHeaders },
  );
}

function toBrowserSearchEntry(block: SearchableWikiBlock): WikiSearchEntry {
  const { sectionId, path, url, heading, slug, level, directText, subtreeText } = block;
  return {
    sectionId,
    path,
    url,
    heading,
    slug,
    level,
    directText,
    ...(subtreeText && subtreeText !== directText ? { subtreeText } : {}),
  };
}

export async function wikiSearchIndexResponse(locale: string, format: 'full' | 'compact' = 'full') {
  if (!isRoutingLocale(locale)) {
    return Response.json({ error: 'invalid_locale' }, { status: 400 });
  }
  const index = await getPublicWikiSearchIndex(locale);
  return Response.json(format === 'compact' ? index.map(toBrowserSearchEntry) : index, {
    headers: publicHeaders,
  });
}
