'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useRef } from 'react';
import { useAppearancePanel } from '@/site/theme/model/use-appearance-panel';
import { ThemePreferences } from '@/site/theme/ui/theme-preferences';

export function AppearancePanel({
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
