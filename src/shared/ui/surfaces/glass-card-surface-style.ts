import type { CSSProperties } from 'react';

export const glassCardSurfaceStyle: CSSProperties = {
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  background: 'var(--theme-surface-glass)',
  border: '1px solid var(--theme-border-glass)',
  borderRadius: '18px',
  boxShadow: '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
};
