'use client';

import { Globe, Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';

import { SiteHeaderAccount } from '@/site/header/ui/site-header-account';
import { ThemeSettings } from '@/site/theme/ui/theme-settings';

interface SiteHeaderControlsProps {
  isMobileMenuOpen: boolean;
  mobileMenuId: string;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
  localeLabel: string;
  localeTooltip: string;
  localeTarget: string;
  onLocaleSwitch: () => void;
  onMobileMenuToggle: () => void;
}

export function SiteHeaderControls({
  isMobileMenuOpen,
  mobileMenuId,
  mobileMenuButtonRef,
  localeLabel,
  localeTooltip,
  localeTarget,
  onLocaleSwitch,
  onMobileMenuToggle,
}: SiteHeaderControlsProps) {
  const controlsT = useTranslations('nav.controls');

  return (
    <div className="project-navbar-controls flex shrink-0 items-center">
      <button
        ref={mobileMenuButtonRef}
        type="button"
        onClick={onMobileMenuToggle}
        className="inline-flex items-center justify-center xl:hidden"
        aria-label={controlsT(isMobileMenuOpen ? 'closeMenu' : 'openMenu')}
        aria-expanded={isMobileMenuOpen}
        aria-controls={mobileMenuId}
      >
        {isMobileMenuOpen ? (
          <X className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Menu className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <fieldset className="project-navbar-control-cluster">
        <legend className="sr-only">{controlsT('display')}</legend>
        <ThemeSettings />

        <button
          type="button"
          onClick={onLocaleSwitch}
          className="project-locale-toggle ui-nav-link inline-flex items-center gap-1.5 py-2"
          title={localeTooltip}
          aria-label={controlsT('switchLanguage', { language: localeLabel })}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span lang={localeTarget}>{localeLabel}</span>
        </button>
      </fieldset>

      <SiteHeaderAccount />
    </div>
  );
}
