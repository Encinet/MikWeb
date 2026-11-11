import 'server-only';

import type { WikiSectionPayload } from '@/modules/wiki/model/wiki-section-types';
import { getWikiContent } from '@/modules/wiki/server/wiki-content';
import { isRoutingLocale } from '@/shared/i18n/routing';

// Server caching is deployment-scoped. Revalidate browser responses after a deployment.
const publicHeaders = { 'Cache-Control': 'public, max-age=0, must-revalidate' };

export async function wikiSectionRequest(request: Request) {
  const params = new URL(request.url).searchParams;
  const locale = params.get('locale') ?? '';
  const id = params.get('section');
  if (!isRoutingLocale(locale) || !id || !/^[a-z0-9-]{1,80}$/.test(id)) {
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

export async function wikiSearchIndexRequest(request: Request) {
  const locale = new URL(request.url).searchParams.get('locale') ?? '';
  if (!isRoutingLocale(locale)) {
    return Response.json({ error: 'invalid_locale' }, { status: 400 });
  }
  const bundle = await getWikiContent(locale, 'public');
  return Response.json(bundle.searchIndex, { headers: publicHeaders });
}
