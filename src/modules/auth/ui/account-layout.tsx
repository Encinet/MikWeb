'use client';

import {
  ChevronDown,
  Fingerprint,
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
import { useAuth } from '@/modules/auth/model/use-auth';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { Link, usePathname, useRouter } from '@/shared/i18n/routing';

interface AccountLayoutProps {
  children: ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const t = useTranslations('auth.account');
  const commonT = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const [logoutFailed, setLogoutFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationId = useId();
  const navigationToggle = useRef<HTMLButtonElement>(null);
  const { account, authenticated, isLoading, logout } = useAuth();

  const navItems = [
    {
      href: '/account',
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
      label: t('navigation.overview'),
    },
    {
      href: '/chat',
      icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
      label: t('navigation.chat'),
    },
    {
      href: '/account/building-submissions',
      icon: <Landmark className="h-4 w-4" aria-hidden="true" />,
      label: t('navigation.buildingSubmission'),
    },
    {
      href: '/account/security',
      icon: <KeyRound className="h-4 w-4" aria-hidden="true" />,
      label: t('navigation.security'),
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

  if (!isLoading && !authenticated) {
    return (
      <div className="account-workspace page-shell page-shell-stable">
        <div className="page-shell-content mx-auto w-full max-w-3xl">
          <section className="account-empty-state">
            <h1>{t('signedOut.title')}</h1>
            <p>{t('signedOut.description')}</p>
            <Link href="/login" className="ui-action-button ui-action-button--primary">
              {commonT('actions.login')}
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="account-workspace page-shell page-shell-stable">
      <div className="account-workspace__inner page-shell-content" aria-busy={isLoading}>
        <aside className="account-sidebar" aria-label={t('title')}>
          <div className="account-identity">
            <div className="account-identity__avatar">
              {account ? (
                <MinecraftAvatar uuid={account.playerUuid} name={account.currentName} size={48} />
              ) : (
                <Fingerprint className="h-9 w-9" aria-hidden="true" />
              )}
            </div>
            <div className="account-identity__copy">
              <strong>{account?.currentName ?? t('loading')}</strong>
              {account ? <p>{t(`roles.${account.role}`)}</p> : null}
            </div>
          </div>

          <button
            ref={navigationToggle}
            type="button"
            className="account-navigation-toggle ui-sidebar-link"
            aria-label={`${t('navigation.label')}: ${currentPage?.label ?? ''}`}
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
            <nav className="account-navigation" aria-label={t('navigation.label')}>
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
              <span>{t('actions.logout')}</span>
            </button>
          </div>
          {logoutFailed ? (
            <p role="alert" className="ui-inline-message">
              {t('logoutFailed')}
            </p>
          ) : null}
        </aside>

        <div className="account-main">{children}</div>
      </div>
    </div>
  );
}
