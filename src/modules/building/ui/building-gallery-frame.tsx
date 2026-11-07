'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { useModalInteraction } from '@/shared/hooks/use-modal-interaction';

export function BuildingGalleryFrame({
  children,
  modal,
  onClose,
  titleId,
  reducedMotion,
}: {
  children: ReactNode;
  modal: boolean;
  onClose: () => void;
  titleId: string;
  reducedMotion: boolean;
}) {
  const mounted = useHasMounted();
  const ref = useRef<HTMLDialogElement>(null);
  useModalInteraction(ref, modal && mounted, onClose);

  if (!modal) {
    return (
      <article className="building-archive-overlay building-gallery-page" aria-labelledby={titleId}>
        {children}
      </article>
    );
  }
  if (!mounted) return null;
  return createPortal(
    <motion.dialog
      ref={ref}
      open
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
      className="building-archive-overlay"
    >
      {children}
    </motion.dialog>,
    document.body,
  );
}
