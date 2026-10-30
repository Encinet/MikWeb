import { BookOpen, Compass, MonitorDown, ScrollText, UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/shared/i18n/routing';

export async function HomeWorldNavigation() {
  const t = await getTranslations('home.playerHome');
  const shortcuts = [
    { href: '/wiki?section=commands', icon: ScrollText, key: 'commands' },
    { href: '/wiki?section=rules', icon: BookOpen, key: 'rules' },
    { href: '/community/notices', icon: ScrollText, key: 'notices' },
    { href: '/pcl2', icon: MonitorDown, key: 'launcher' },
    { href: '/wiki?section=getting-started', icon: Compass, key: 'gettingStarted' },
  ] as const;

  return (
    <nav className="home-player-shortcuts" aria-label={t('tools.title')}>
      {shortcuts.map(({ href, icon: Icon, key }) => (
        <Link key={key} href={href}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{t(`shortcuts.${key}`)}</span>
        </Link>
      ))}
      <a href="https://apply.mcmik.top" target="_blank" rel="noopener noreferrer">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        <span>{t('shortcuts.apply')}</span>
      </a>
    </nav>
  );
}
