'use client';

import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

export interface PlayerHistorySummaryCardItem {
  color: string;
  hint: string;
  icon: LucideIcon;
  label: string;
  value: string;
}

interface PlayerHistorySummaryGridProps {
  items: PlayerHistorySummaryCardItem[];
}

export function PlayerHistorySummaryGrid({ items }: PlayerHistorySummaryGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <PlayerHistorySummaryCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function PlayerHistorySummaryCard({ item }: { item: PlayerHistorySummaryCardItem }) {
  const Icon = item.icon;

  return (
    <div
      className="player-history-summary-card"
      style={{ '--player-history-accent': item.color } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div style={{ color: 'var(--theme-text-muted-soft)', fontSize: '0.8rem' }}>
            {item.label}
          </div>
          <div
            style={{
              marginTop: '0.65rem',
              color: 'var(--theme-text-heading)',
              fontSize: 'clamp(1.3rem, 2vw, 1.7rem)',
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {item.value}
          </div>
        </div>
        <div
          style={{
            width: '2.6rem',
            height: '2.6rem',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: `color-mix(in srgb, ${item.color} 16%, transparent)`,
            border: `1px solid color-mix(in srgb, ${item.color} 26%, transparent)`,
            color: item.color,
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div style={{ marginTop: '0.9rem', color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
        {item.hint}
      </div>
    </div>
  );
}
