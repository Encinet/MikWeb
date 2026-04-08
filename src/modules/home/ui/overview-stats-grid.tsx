'use client';

import type { LucideIcon } from 'lucide-react';

export interface HomeOverviewStat {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  suffix?: string;
  value: string;
}

interface OverviewStatsGridProps {
  stats: HomeOverviewStat[];
}

export function OverviewStatsGrid({ stats }: OverviewStatsGridProps) {
  return (
    <div className="mb-12 grid grid-cols-1 gap-4 sm:mb-20 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {stats.map((stat) => (
        <OverviewStatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}

function OverviewStatCard({ stat }: { stat: HomeOverviewStat }) {
  return (
    <div
      className="ui-card-surface ui-card-interactive"
      style={{
        padding: 'clamp(1.25rem, 3vw, 1.5rem)',
      }}
    >
      <div
        className="ui-card-icon-surface"
        style={{
          width: 'clamp(2.5rem, 6vw, 3rem)',
          height: 'clamp(2.5rem, 6vw, 3rem)',
          marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
        }}
      >
        <stat.icon
          style={{
            width: 'clamp(1.25rem, 3vw, 1.5rem)',
            height: 'clamp(1.25rem, 3vw, 1.5rem)',
            color: stat.iconColor,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
          fontWeight: 600,
          color: 'var(--theme-text-heading)',
          marginBottom: '4px',
        }}
      >
        {stat.value}
        {stat.suffix ? (
          <span
            style={{
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              marginLeft: '4px',
              fontWeight: 500,
            }}
          >
            {stat.suffix}
          </span>
        ) : null}
      </div>
      <div
        style={{
          color: 'var(--theme-text-muted)',
          fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
        }}
      >
        {stat.label}
      </div>
    </div>
  );
}
