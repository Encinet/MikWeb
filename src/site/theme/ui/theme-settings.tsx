'use client';

import { ChevronDown, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppearancePanel } from '@/site/theme/model/use-appearance-panel';
import { ThemePreferences } from '@/site/theme/ui/theme-preferences';

export function ThemeSettings() {
  const t = useTranslations('nav.theme');
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="project-appearance-toggle"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        aria-haspopup="dialog"
      >
        <span className="project-appearance-label">{t('appearance')}</span>
        <span className="project-appearance-label-compact">{t('shortLabel')}</span>
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

function AppearancePanel({
  id,
  anchorRef,
  onClose,
}: {
  id: string;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const t = useTranslations('nav.theme');
  const commonT = useTranslations('common');
  const ref = useRef<HTMLDialogElement>(null);
  useAppearancePanel(ref, anchorRef, onClose);

  return (
    <dialog ref={ref} id={id} aria-label={t('appearance')} className="appearance-panel">
      <button
        type="button"
        className="appearance-panel__close"
        aria-label={commonT('actions.close')}
        onClick={onClose}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="appearance-panel__body">
        <ThemePreferences />
      </div>
    </dialog>
  );
}
