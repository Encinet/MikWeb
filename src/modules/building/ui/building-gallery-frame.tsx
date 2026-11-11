'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, ViewTransition } from 'react';
import { createPortal } from 'react-dom';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { useModalInteraction } from '@/shared/hooks/use-modal-interaction';

export function BuildingGalleryFrame({
  children,
  modal,
  onClose,
  onEscape = onClose,
  titleId,
  focused = false,
}: {
  children: ReactNode;
  modal: boolean;
  onClose: () => void;
  onEscape?: () => void;
  titleId: string;
  focused?: boolean;
}) {
  const mounted = useHasMounted();
  const ref = useRef<HTMLDialogElement>(null);
  useModalInteraction(ref, modal && mounted, onEscape);

  useEffect(() => {
    if (modal && !mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-building-gallery-open', titleId);
    root.setAttribute('data-building-gallery-mode', modal ? 'modal' : 'page');
    return () => {
      // Activity keeps hidden routes in the DOM; only the active route owns the canvas.
      if (root.getAttribute('data-building-gallery-open') === titleId) {
        root.removeAttribute('data-building-gallery-open');
        root.removeAttribute('data-building-gallery-mode');
      }
    };
  }, [modal, mounted, titleId]);

  if (!modal) {
    return (
      <ViewTransition default="none" enter="building-gallery-open" exit="building-gallery-close">
        <article
          className={`building-archive-overlay building-gallery-page ${focused ? 'is-focused' : ''}`}
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
        className={`building-archive-overlay ${focused ? 'is-focused' : ''}`}
      >
        {children}
      </dialog>
    </ViewTransition>,
    document.body,
  );
}
