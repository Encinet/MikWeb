import type { CSSProperties } from 'react';

export type HistoryKeyboardAction =
  | 'previous-point'
  | 'next-point'
  | 'jump-to-peak'
  | 'jump-to-latest'
  | 'clear-lock'
  | 'toggle-lock';

export const historyInsetPanelStyle: CSSProperties = {
  padding: '1rem',
  borderRadius: '20px',
  border: '1px solid var(--theme-border-glass)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, var(--theme-surface-icon) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
};

export const historyStatTileStyle: CSSProperties = {
  padding: '0.85rem',
  borderRadius: '16px',
  border: '1px solid var(--theme-border-glass-light)',
  background:
    'linear-gradient(180deg, var(--theme-surface-glass-light) 0%, rgba(255,255,255,0.02) 100%)',
};

export const historyChartCardStyle: CSSProperties = {
  ...historyInsetPanelStyle,
  background:
    'linear-gradient(180deg, var(--theme-surface-icon) 0%, var(--theme-surface-glass-light) 100%)',
};

export const historyChartFrameStyle: CSSProperties = {
  marginTop: '1rem',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '1px solid var(--theme-border-glass-light)',
  background: 'linear-gradient(180deg, rgba(255,170,0,0.06) 0%, rgba(85,170,255,0.03) 100%)',
  position: 'relative',
};

export const historyChartHintBarStyle: CSSProperties = {
  borderTop: '1px solid var(--theme-border-glass-light)',
  background: 'rgba(255,255,255,0.02)',
};

export const historyContextRailStyle: CSSProperties = {
  marginTop: '0.75rem',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

export const historyDetailPanelStyle: CSSProperties = {
  ...historyInsetPanelStyle,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
};

export const historyTooltipCardStyle: CSSProperties = {
  padding: '0.8rem 0.9rem',
  borderRadius: '16px',
  border: '1px solid rgba(255, 170, 0, 0.16)',
  background: 'rgba(18, 18, 20, 0.72)',
  backdropFilter: 'blur(18px) saturate(180%)',
  WebkitBackdropFilter: 'blur(18px) saturate(180%)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.12)',
  pointerEvents: 'none',
  zIndex: 2,
};

export const historyPlayerListStyle: CSSProperties = {
  marginTop: '0.6rem',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.45rem',
  alignContent: 'flex-start',
  maxHeight: '14rem',
  overflowY: 'auto',
  paddingRight: '0.25rem',
};

export const historyPlayerChipStyle: CSSProperties = {
  padding: '0.35rem 0.65rem',
  borderRadius: '999px',
  background: 'var(--theme-surface-glass-light)',
  border: '1px solid var(--theme-border-glass-light)',
  color: 'var(--theme-text-primary)',
  fontSize: '0.85rem',
};

export const historyTooltipPlayerChipStyle: CSSProperties = {
  padding: '0.18rem 0.5rem',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--theme-text-primary)',
  fontSize: '0.75rem',
};

export const historyTooltipOverflowChipStyle: CSSProperties = {
  padding: '0.18rem 0.5rem',
  borderRadius: '999px',
  background: 'rgba(255,170,0,0.12)',
  border: '1px solid rgba(255,170,0,0.14)',
  color: 'var(--theme-accent-amber-strong)',
  fontSize: '0.75rem',
};

export const historyStaleWarningStyle: CSSProperties = {
  marginTop: '1rem',
  padding: '0.8rem 0.9rem',
  borderRadius: '14px',
  background: 'rgba(248, 113, 113, 0.08)',
  border: '1px solid rgba(248, 113, 113, 0.16)',
  color: 'var(--theme-accent-red)',
  fontSize: '0.82rem',
};

export const historyProgressTrackStyle: CSSProperties = {
  width: '100%',
  height: '0.45rem',
  borderRadius: '999px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--theme-border-glass-light)',
};

export function getHistoryProgressFillStyle(progressRatio: number): CSSProperties {
  return {
    width: `${Math.max(0, Math.min(progressRatio, 1)) * 100}%`,
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(255,170,0,0.92), rgba(85,170,255,0.82))',
    boxShadow: '0 0 20px rgba(255,170,0,0.28)',
  };
}

export function getHistoryControlButtonStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.55rem 0.9rem',
    borderRadius: '16px',
    border: active ? '1px solid rgba(255, 170, 0, 0.45)' : '1px solid var(--theme-border-glass)',
    background: active
      ? 'linear-gradient(135deg, rgba(255, 170, 0, 0.16), rgba(255, 170, 0, 0.08))'
      : 'linear-gradient(180deg, rgba(255,255,255,0.04), var(--theme-surface-icon))',
    color: active ? 'var(--theme-text-heading)' : 'var(--theme-text-muted-soft)',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    transition:
      'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease',
    whiteSpace: 'nowrap',
    boxShadow: active ? '0 10px 24px rgba(255, 170, 0, 0.08)' : 'none',
  };
}

export function getHistoryActionButtonStyle(): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.55rem 0.8rem',
    borderRadius: '999px',
    border: '1px solid var(--theme-border-glass)',
    background: 'var(--theme-surface-icon)',
    color: 'var(--theme-text-muted-soft)',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
}

export function getHistoryModeBadgeStyle(isLocked: boolean): CSSProperties {
  return {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.18rem 0.55rem',
    borderRadius: '999px',
    border: '1px solid var(--theme-border-glass-light)',
    background: isLocked ? 'rgba(255,170,0,0.12)' : 'var(--theme-surface-glass-light)',
    color: isLocked ? 'var(--theme-accent-amber-strong)' : 'var(--theme-text-muted-soft)',
    fontSize: '0.72rem',
  };
}

export function getHistoryMetaPillStyle(
  emphasis: 'default' | 'highlight' = 'default',
): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.28rem 0.6rem',
    borderRadius: '999px',
    border:
      emphasis === 'highlight'
        ? '1px solid rgba(255,170,0,0.24)'
        : '1px solid var(--theme-border-glass-light)',
    background:
      emphasis === 'highlight' ? 'rgba(255,170,0,0.12)' : 'var(--theme-surface-glass-light)',
    color:
      emphasis === 'highlight'
        ? 'var(--theme-accent-amber-strong)'
        : 'var(--theme-text-muted-soft)',
    fontSize: '0.76rem',
    lineHeight: 1.1,
  };
}

export function getHistoryDeltaColor(delta: number | null): string {
  if (delta === null) {
    return 'var(--theme-text-muted-soft)';
  }

  return delta >= 0 ? 'var(--theme-accent-green-strong)' : 'var(--theme-accent-red)';
}

export function resolveHistoryKeyboardAction(key: string): HistoryKeyboardAction | null {
  switch (key) {
    case 'ArrowLeft':
      return 'previous-point';
    case 'ArrowRight':
      return 'next-point';
    case 'Home':
      return 'jump-to-peak';
    case 'End':
      return 'jump-to-latest';
    case 'Escape':
      return 'clear-lock';
    case 'Enter':
    case ' ':
      return 'toggle-lock';
    default:
      return null;
  }
}
