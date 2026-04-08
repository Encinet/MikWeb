'use client';

import type { WikiSectionOutlineItem } from '@/modules/wiki/model/wiki-section-types';

interface WikiOutlineLinksProps {
  items: WikiSectionOutlineItem[];
  label: string;
  onOpen: (item: WikiSectionOutlineItem) => void;
}

export function WikiOutlineLinks({ items, label, onOpen }: WikiOutlineLinksProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="not-prose mb-8 border-b pb-5"
      style={{ borderColor: 'var(--theme-border-glass-light)' }}
    >
      <p
        className="mb-3 text-xs uppercase tracking-[0.2em]"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        {label}
      </p>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            type="button"
            key={`${item.slug}-${item.heading}`}
            onClick={() => onOpen(item)}
            className="rounded-full px-3 py-1.5 text-sm transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid var(--theme-border-glass-light)',
              color: 'var(--theme-text-muted-strong)',
              paddingLeft: item.level === 3 ? '1rem' : '0.75rem',
            }}
          >
            {item.level === 3 ? `↳ ${item.heading}` : item.heading}
          </button>
        ))}
      </div>
    </div>
  );
}
