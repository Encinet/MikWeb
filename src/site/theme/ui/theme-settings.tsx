'use client';

import { ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackgroundPrefetch } from '@/shared/hooks/use-background-prefetch';

const loadAppearancePanel = () => import('@/site/theme/ui/appearance-panel');
const AppearancePanel = dynamic(
  () => loadAppearancePanel().then((module) => module.AppearancePanel),
  {
    ssr: false,
  },
);

export function ThemeSettings() {
  useBackgroundPrefetch(loadAppearancePanel);
  const pathname = usePathname();
  const t = useTranslations('nav.theme');
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setIsOpen(false), []);
  useLayoutEffect(() => {
    if (pathname) close();
    return close;
  }, [close, pathname]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        onPointerEnter={() => void loadAppearancePanel().catch(() => undefined)}
        onFocus={() => void loadAppearancePanel().catch(() => undefined)}
        className="project-appearance-toggle"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        aria-haspopup="dialog"
      >
        <span className="project-appearance-label">{t('appearance')}</span>
        <span className="project-appearance-label-compact">{t('appearance')}</span>
        <ChevronDown className="project-appearance-chevron h-3 w-3" aria-hidden="true" />
      </button>
      {isOpen &&
        createPortal(
          <AppearancePanel id={id} anchorRef={anchorRef} onClose={close} />,
          document.body,
        )}
    </>
  );
}
