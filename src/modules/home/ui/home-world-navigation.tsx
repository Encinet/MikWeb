'use client';

import { BookOpen, Compass, MessageCircle, MonitorDown, ScrollText, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/modules/auth/model/use-auth';
import { Link } from '@/shared/i18n/navigation';

export function HomeWorldNavigation() {
  const t = useTranslations();
  const { authenticated, isLoading } = useAuth();
  const shortcuts = [
    {
      href: '/wiki?section=commands',
      icon: ScrollText,
      label: t('home.playerHome.shortcuts.commands'),
    },
    { href: '/wiki?section=rules', icon: BookOpen, label: t('home.playerHome.shortcuts.rules') },
    { href: '/pcl2', icon: MonitorDown, label: t('home.playerHome.shortcuts.launcher') },
    {
      href: '/wiki?section=getting-started',
      icon: Compass,
      label: t('home.playerHome.shortcuts.gettingStarted'),
    },
  ] as const;

  return (
    <nav className="home-player-shortcuts" aria-label={t('home.playerHome.tools.title')}>
      {shortcuts.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
      {authenticated ? (
        <Link href="/chat">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>{t('chat.title')}</span>
        </Link>
      ) : !isLoading ? (
        <Link href="/join">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          <span>{t('nav.items.join')}</span>
        </Link>
      ) : null}
    </nav>
  );
}
