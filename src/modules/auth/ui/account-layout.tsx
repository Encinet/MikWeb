'use client';

import { Fingerprint, KeyRound, Landmark, LayoutDashboard, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useAuth } from '@/modules/auth/model/use-auth';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { Link, usePathname, useRouter } from '@/shared/i18n/routing';

interface AccountLayoutProps {
  children: ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const t = useTranslations('auth.account');
  const pathname = usePathname();
  const router = useRouter();
  const { account, authenticated, isLoading, logout } = useAuth();

  const navItems = useMemo(
    () => [
      {
        href: '/account',
        icon: <LayoutDashboard className="h-4 w-4" />,
        label: t('navigation.overview'),
      },
      {
        href: '/account/building-submissions',
        icon: <Landmark className="h-4 w-4" />,
        label: t('navigation.buildingSubmission'),
      },
      {
        href: '/account/security',
        icon: <KeyRound className="h-4 w-4" />,
        label: t('navigation.security'),
      },
    ],
    [t],
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!isLoading && !authenticated) {
    return (
      <div className="account-workspace page-shell page-shell-stable">
        <div className="page-shell-content mx-auto w-full max-w-3xl">
          <section className="account-empty-state">
            <h1>{t('signedOut.title')}</h1>
            <p>{t('signedOut.description')}</p>
            <Link href="/login" className="account-action-button account-action-button--primary">
              {t('actions.login')}
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="account-workspace page-shell page-shell-stable">
      <div className="account-workspace__inner page-shell-content mx-auto w-full max-w-7xl">
        <aside className="account-sidebar">
          <div className="account-sidebar__identity">
            <div className="account-sidebar__avatar">
              {account ? (
                <MinecraftAvatar uuid={account.playerUuid} name={account.currentName} size={72} />
              ) : (
                <Fingerprint className="h-9 w-9" />
              )}
            </div>
            <div>
              <p>{t('title')}</p>
              <h1>{account?.currentName ?? t('loading')}</h1>
              {account?.role ? <span>{account.role}</span> : null}
            </div>
          </div>

          <nav className="account-sidebar__nav" aria-label={t('navigation.label')}>
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'is-active' : undefined}
                  href={item.href}
                  key={item.href}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button type="button" className="account-sidebar__logout" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span>{t('actions.logout')}</span>
          </button>
        </aside>

        <main className="account-main">{children}</main>
      </div>
    </div>
  );
}
