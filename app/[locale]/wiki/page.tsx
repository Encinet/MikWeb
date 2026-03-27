import fs from 'node:fs';
import path from 'node:path';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { requireRouteLocale } from '@/lib/routeLocale';
import type { WikiSectionContentMap, WikiSectionDefinition, WikiSectionId } from '@/lib/types';
import {
  isWikiSectionId,
  WIKI_SECTION_ICONS,
  WIKI_SECTION_TRANSLATION_KEYS,
  WIKI_SECTIONS,
} from '@/lib/wiki';
import WikiContent from './WikiContent';

export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const { section } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'wiki' });

  const sections: WikiSectionDefinition[] = WIKI_SECTIONS.map((id) => ({
    id,
    icon: WIKI_SECTION_ICONS[id],
    label: t(WIKI_SECTION_TRANSLATION_KEYS[id]),
  }));

  // Read all markdown files
  const contentEntries = sections.map((wikiSection) => {
    const filePath = path.join(process.cwd(), 'content', locale, `${wikiSection.id}.md`);

    try {
      return [wikiSection.id, fs.readFileSync(filePath, 'utf-8')] as const satisfies readonly [
        WikiSectionId,
        string,
      ];
    } catch {
      return [
        wikiSection.id,
        `# ${wikiSection.label}\n\nContent not available.`,
      ] as const satisfies readonly [WikiSectionId, string];
    }
  });
  const content = Object.fromEntries(contentEntries) as WikiSectionContentMap;

  const validSections = sections.map((wikiSection) => wikiSection.id);
  const initialSection =
    section && isWikiSectionId(section) && validSections.includes(section)
      ? section
      : 'getting-started';

  return (
    <Suspense>
      <WikiContent
        title={t('title')}
        description={t('description')}
        navigation={t('navigation')}
        sections={sections}
        content={content}
        initialSection={initialSection}
      />
    </Suspense>
  );
}
