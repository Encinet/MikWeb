'use client';

interface PlayerHistoryToolbarBadgeProps {
  label: string;
  tone?: 'default' | 'highlight';
  value: string;
}

export function PlayerHistoryToolbarBadge({
  label,
  tone = 'default',
  value,
}: PlayerHistoryToolbarBadgeProps) {
  return (
    <div
      className="player-history-toolbar-badge"
      style={{
        borderColor:
          tone === 'highlight' ? 'rgba(255, 170, 0, 0.22)' : 'var(--theme-border-glass-light)',
        background:
          tone === 'highlight'
            ? 'linear-gradient(135deg, rgba(255,170,0,0.12), rgba(85,170,255,0.06))'
            : 'var(--theme-surface-icon)',
      }}
    >
      <span style={{ color: 'var(--theme-text-muted)', fontSize: '0.72rem' }}>{label}</span>
      <span
        style={{
          color:
            tone === 'highlight' ? 'var(--theme-accent-amber-strong)' : 'var(--theme-text-heading)',
          fontSize: '0.92rem',
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}
