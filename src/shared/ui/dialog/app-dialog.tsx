'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { useModalInteraction } from '@/shared/hooks/use-modal-interaction';

interface AppDialogProps {
  children: ReactNode;
  title: string;
  icon: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  descriptionId?: string;
  dismissible?: boolean;
}

export function AppDialog(props: AppDialogProps) {
  const mounted = useHasMounted();
  if (!mounted || !props.isOpen) return null;
  return createPortal(<OpenDialog {...props} />, document.body);
}

function OpenDialog({
  children,
  title,
  icon,
  onClose,
  className = '',
  descriptionId,
  dismissible = true,
}: AppDialogProps) {
  const t = useTranslations('common');
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const requestClose = () => {
    if (dismissible) onClose();
  };
  useModalInteraction(ref, true, requestClose);

  return (
    <div className="ui-dialog-overlay safe-fixed-overlay">
      <button
        type="button"
        className="app-dialog-backdrop"
        tabIndex={-1}
        aria-label={t('actions.close')}
        onClick={requestClose}
        disabled={!dismissible}
      />
      <dialog
        ref={ref}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`ui-dialog-surface app-dialog-window ${className}`}
      >
        <header className="app-dialog-chrome">
          <span className="app-dialog-icon" aria-hidden="true">
            {icon}
          </span>
          <h2 className="app-dialog-title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={!dismissible}
            aria-label={t('actions.close')}
            data-dialog-close
            className="app-dialog-close ui-floating-control"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="app-dialog-body">{children}</div>
      </dialog>
    </div>
  );
}
