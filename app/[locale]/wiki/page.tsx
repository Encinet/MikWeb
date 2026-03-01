import { getTranslations } from 'next-intl/server';
import fs from 'fs';
import path from 'path';
import { Suspense } from 'react';
import WikiClient from './WikiClient';

export default async function WikiPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ section?: string }> }) {
  const { locale } = await params;
  const { section } = await searchParams;
  const t = await getTranslations('wiki');

  const sections = [
    { id: 'getting-started', icon: 'Home', label: t('sections.gettingStarted') },
    { id: 'rules', icon: 'Shield', label: t('sections.rules') },
    { id: 'commands', icon: 'Wrench', label: t('sections.commands') },
    { id: 'community', icon: 'Users', label: t('sections.community') },
    { id: 'tips', icon: 'Zap', label: t('sections.tips') }
  ];

  // Read all markdown files
  const content: Record<string, string> = {};
  for (const section of sections) {
    const filePath = path.join(process.cwd(), 'content', locale, `${section.id}.md`);
    try {
      content[section.id] = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      content[section.id] = `# ${section.label}\n\nContent not available.`;
    }
  }

  const validSections = sections.map(s => s.id);
  const initialSection = section && validSections.includes(section) ? section : 'getting-started';

  return (
    <Suspense>
      <WikiClient
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
