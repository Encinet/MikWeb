import fs from 'fs';
import { getTranslations } from 'next-intl/server';
import path from 'path';
import { Suspense } from 'react';

import { WIKI_SECTIONS } from '@/lib/wiki';
import WikiContent from './WikiContent';

export default async function WikiPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ section?: string }> }) {
  const { locale } = await params;
  const { section } = await searchParams;
  const t = await getTranslations('wiki');

  const sectionMeta: Record<(typeof WIKI_SECTIONS)[number], { icon: string; labelKey: string }> = {
    'getting-started': { icon: 'Home', labelKey: 'sections.gettingStarted' },
    'rules': { icon: 'Shield', labelKey: 'sections.rules' },
    'commands': { icon: 'Wrench', labelKey: 'sections.commands' },
    'community': { icon: 'Users', labelKey: 'sections.community' },
    'tips': { icon: 'Zap', labelKey: 'sections.tips' },
  };

  const sections = WIKI_SECTIONS.map((id) => ({
    id,
    icon: sectionMeta[id].icon,
    label: t(sectionMeta[id].labelKey),
  }));

  // Read all markdown files
  const content: Record<string, string> = {};
  for (const section of sections) {
    const filePath = path.join(process.cwd(), 'content', locale, `${section.id}.md`);
    try {
      content[section.id] = fs.readFileSync(filePath, 'utf-8');
    } catch {
      content[section.id] = `# ${section.label}\n\nContent not available.`;
    }
  }

  const validSections = sections.map(s => s.id);
  const initialSection = section && (validSections as string[]).includes(section) ? section : 'getting-started';

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
