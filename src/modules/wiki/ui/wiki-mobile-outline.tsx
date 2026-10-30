'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WikiSectionOutlineItem } from '@/modules/wiki/model/wiki-section-types';
import { WikiOutlineLinks } from '@/modules/wiki/ui/wiki-outline-links';

interface WikiMobileOutlineProps {
  activeSlug: string;
  sectionId: string;
  items: WikiSectionOutlineItem[];
  label: string;
  onOpen: (item: WikiSectionOutlineItem) => void;
}

export function WikiMobileOutline(props: WikiMobileOutlineProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const currentHeading = props.items.find((item) => item.slug === props.activeSlug)?.heading;

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent | PointerEvent) => {
      const details = detailsRef.current;
      if (!details) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return;
        details.open = false;
        details.querySelector('summary')?.focus({ preventScroll: true });
      } else if (event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, [isOpen]);

  return (
    <details
      ref={detailsRef}
      className="wiki-page__mobile-outline"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{props.label}</span>
        <span className="wiki-page__outline-current">{currentHeading}</span>
        <ChevronDown className="wiki-page__outline-chevron h-4 w-4" aria-hidden="true" />
      </summary>
      <WikiOutlineLinks
        {...props}
        visible={isOpen}
        onOpen={(item) => {
          if (detailsRef.current) detailsRef.current.open = false;
          props.onOpen(item);
        }}
      />
    </details>
  );
}
