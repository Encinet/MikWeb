'use client';

import { BookOpen, Compass, MessageCircle, MonitorDown, ScrollText, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/modules/auth/model/use-auth';
import { Link } from '@/shared/i18n/routing';

export function HomeWorldNavigation() {
  const t = useTranslations('home.playerHome');
  const navT = useTranslations('nav.items');
  const { authenticated, isLoading } = useAuth();
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
      {authenticated ? (
        <Link href="/chat">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>{navT('chat')}</span>
        </Link>
      ) : !isLoading ? (
        <a href="https://apply.mcmik.top" target="_blank" rel="noopener noreferrer">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          <span>{navT('join')}</span>
        </a>
      ) : null}
    </nav>
  );
}
