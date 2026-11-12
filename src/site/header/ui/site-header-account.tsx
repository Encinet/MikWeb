'use client';

import { UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/modules/auth/model/use-auth';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { Link } from '@/shared/i18n/navigation';

export function SiteHeaderAccount() {
  const t = useTranslations();
  const { account } = useAuth();
  const accountLabel = t('auth.account.title');
  const accountDescription = account ? `${accountLabel} · ${account.currentName}` : accountLabel;
  const loginLabel = t('common.actions.login');

  return (
    <div className="project-account-links">
      <Link
        href="/account"
        prefetch={account ? undefined : false}
        className="project-account-link project-account-link--signed-in project-auth-variant"
        data-auth-audience="signed-in"
        title={accountDescription}
        aria-label={accountDescription}
      >
        <span className="project-account-avatar-frame">
          <span className="project-account-avatar project-account-avatar--pending">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          {account ? (
            <MinecraftAvatar
              uuid={account.playerUuid}
              name={account.currentName}
              size={28}
              className="project-account-avatar"
            />
          ) : null}
        </span>
        <span className="project-account-label">{account?.currentName ?? accountLabel}</span>
      </Link>
      <Link
        href="/login"
        prefetch={false}
        className="project-account-link project-account-link--signed-out project-auth-variant"
        data-auth-audience="signed-out"
        title={loginLabel}
        aria-label={loginLabel}
      >
        <span className="project-account-login-icon">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="project-account-login-label">{loginLabel}</span>
      </Link>
    </div>
  );
}
