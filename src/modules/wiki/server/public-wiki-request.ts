import 'server-only';

import type { WikiSectionPayload } from '@/modules/wiki/model/wiki-content-types';
import { isWikiSectionId } from '@/modules/wiki/server/public-wiki-paths';
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
      compiled: bundle.compiled[id],
      outline: bundle.outlines[id],
    } satisfies WikiSectionPayload,
    { headers: publicHeaders },
  );
}

export async function wikiSearchIndexResponse(locale: string) {
  if (!isRoutingLocale(locale)) {
    return Response.json({ error: 'invalid_locale' }, { status: 400 });
  }
  const bundle = await getWikiContent(locale, 'public');
  return Response.json(bundle.searchIndex, { headers: publicHeaders });
}
