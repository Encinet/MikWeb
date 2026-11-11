'use client';

import {
  ChevronDown,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PanelLeft,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, ReactNode } from 'react';
import { useId, useRef, useState } from 'react';
import { isMemberRole } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

interface AccountLayoutProps {
  children: ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [logoutFailed, setLogoutFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationId = useId();
  const navigationToggle = useRef<HTMLButtonElement>(null);
  const { account, isLoading, verified, logout, refresh } = useAuth();

  const navItems = [
    {
      href: '/account',
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
      label: t('auth.account.overview.title'),
    },
    {
      href: '/chat',
      icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
      label: t('chat.title'),
    },
    ...(isMemberRole(account?.role)
      ? [
          {
            href: '/account/building-submissions',
            icon: <Landmark className="h-4 w-4" aria-hidden="true" />,
            label: t('buildingSubmission.title'),
          },
        ]
      : []),
    {
      href: '/account/security',
      icon: <KeyRound className="h-4 w-4" aria-hidden="true" />,
      label: t('auth.security.title'),
    },
  ];
  const currentPage = navItems.find((item) => item.href === pathname);
  const handleNavigationKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !navigationOpen) return;
    event.stopPropagation();
    setNavigationOpen(false);
    navigationToggle.current?.focus();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutFailed(false);
    try {
      await logout();
      router.replace('/login');
    } catch {
      setLogoutFailed(true);
    } finally {
      setLoggingOut(false);
    }
  };

  if (!verified || !account) {
    const verificationFailed = !isLoading && !verified;
    let heading = t('auth.account.signedOut.title');
    if (isLoading) heading = t('auth.account.title');
    else if (verificationFailed) heading = t('auth.account.verificationFailed.title');
    return (
      <div className="account-workspace page-shell page-shell-stable">
        <div className="page-shell-content mx-auto w-full max-w-3xl">
          <section className="account-empty-state" aria-busy={isLoading}>
            <h1>{heading}</h1>
            {isLoading ? (
              <LoadingState message={t('common.states.loading')} variant="inline" />
            ) : verificationFailed ? (
              <>
                <p role="alert">{t('auth.account.verificationFailed.description')}</p>
                <button
                  type="button"
                  className="ui-action-button ui-action-button--primary"
                  onClick={() => void refresh().catch(() => undefined)}
                >
                  {t('common.actions.retry')}
                </button>
              </>
            ) : (
              <>
                <p>{t('auth.account.signedOut.description')}</p>
                <Link href="/login" className="ui-action-button ui-action-button--primary">
                  {t('common.actions.login')}
                </Link>
              </>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="account-workspace page-shell page-shell-stable">
      <div className="account-workspace__inner page-shell-content" aria-busy={isLoading}>
        <aside className="account-sidebar" aria-label={t('auth.account.title')}>
          <div className="account-identity">
            <div className="account-identity__avatar">
              <MinecraftAvatar uuid={account.playerUuid} name={account.currentName} size={48} />
            </div>
            <div className="account-identity__copy">
              <strong>{account.currentName}</strong>
              <p>{t(`auth.account.roles.${account.role}`)}</p>
            </div>
          </div>

          <button
            ref={navigationToggle}
            type="button"
            className="account-navigation-toggle ui-sidebar-link"
            aria-label={`${t('auth.account.navigation.label')}: ${currentPage?.label ?? ''}`}
            aria-expanded={navigationOpen}
            aria-controls={navigationId}
            onClick={() => setNavigationOpen((open) => !open)}
            onKeyDown={handleNavigationKeyDown}
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
            <span>{currentPage?.label}</span>
            <ChevronDown
              className="account-navigation-toggle__chevron h-4 w-4"
              aria-hidden="true"
            />
          </button>

          <div id={navigationId} className="account-sidebar__body" data-expanded={navigationOpen}>
            <nav className="account-navigation" aria-label={t('auth.account.navigation.label')}>
              {navItems.map((item) => (
                <Link
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className="ui-sidebar-link"
                  href={item.href}
                  key={item.href}
                  onKeyDown={handleNavigationKeyDown}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      !navigationOpen
                    )
                      return;
                    setNavigationOpen(false);
                    navigationToggle.current?.focus();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <button
              type="button"
              className="account-logout ui-action-button"
              disabled={loggingOut || isLoading}
              onClick={handleLogout}
              onKeyDown={handleNavigationKeyDown}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{t('auth.account.actions.logout')}</span>
            </button>
          </div>
          {logoutFailed ? (
            <p role="alert" className="ui-inline-message">
              {t('auth.account.logoutFailed')}
            </p>
          ) : null}
        </aside>

        <div className="account-main">{children}</div>
      </div>
    </div>
  );
}
