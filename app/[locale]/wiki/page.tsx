import { getTranslations } from 'next-intl/server';
import fs from 'fs';
import path from 'path';
import WikiClient from './WikiClient';

export default async function WikiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
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

  return (
    <WikiClient
      title={t('title')}
      description={t('description')}
      navigation={t('navigation')}
      sections={sections}
      content={content}
    />
  );
}
