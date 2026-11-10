'use client';

import type { ReactNode } from 'react';
import { useRef, ViewTransition } from 'react';
import { createPortal } from 'react-dom';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { useModalInteraction } from '@/shared/hooks/use-modal-interaction';

export function BuildingGalleryFrame({
  children,
  modal,
  onClose,
  titleId,
}: {
  children: ReactNode;
  modal: boolean;
  onClose: () => void;
  titleId: string;
}) {
  const mounted = useHasMounted();
  const ref = useRef<HTMLDialogElement>(null);
  useModalInteraction(ref, modal && mounted, onClose);

  if (!modal) {
    return (
      <ViewTransition default="none" enter="building-gallery-open" exit="building-gallery-close">
        <article
          className="building-archive-overlay building-gallery-page"
          aria-labelledby={titleId}
        >
          {children}
        </article>
      </ViewTransition>
    );
  }
  if (!mounted) return null;
  return createPortal(
    <ViewTransition default="none" enter="building-gallery-open" exit="building-gallery-close">
      <dialog
        ref={ref}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="building-archive-overlay"
      >
        {children}
      </dialog>
    </ViewTransition>,
    document.body,
  );
}
