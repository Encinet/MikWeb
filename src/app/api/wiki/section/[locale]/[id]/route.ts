import { getPublicWikiSectionParams } from '@/modules/wiki/server/public-wiki-paths';
import { wikiSectionResponse } from '@/modules/wiki/server/public-wiki-request';

export function generateStaticParams() {
  return getPublicWikiSectionParams();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale, id } = await params;
  return wikiSectionResponse(locale, id);
}
