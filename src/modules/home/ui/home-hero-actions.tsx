'use client';

import { BookOpen, Play, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/modules/auth/model/use-auth';
import { Link } from '@/shared/i18n/routing';

const APPLY_URL = 'https://apply.mcmik.top';

export function HomeHeroActions() {
  const t = useTranslations('home.hero');
  const { authenticated, isLoading } = useAuth();

  return (
    <div className="home-project-hero__actions">
      {authenticated ? (
        <Link href="/account" className="home-project-button">
          <UserRound className="h-5 w-5" />
          <span>{t('accountButton')}</span>
        </Link>
      ) : isLoading ? null : (
        <a
          href={APPLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="home-project-button"
        >
          <Play className="h-5 w-5" />
          <span>{t('joinButton')}</span>
        </a>
      )}
      <Link href="/wiki" className="home-project-button home-project-button--secondary">
        <BookOpen className="h-5 w-5" />
        <span>{t('wikiButton')}</span>
      </Link>
    </div>
  );
}
