import { Home, Shield, Users, Wrench, Zap } from 'lucide-react';
import type React from 'react';

import type { WikiSectionIcon } from '@/modules/wiki/model/wiki-section-types';

export const iconMap = new Map<WikiSectionIcon, React.ComponentType<{ className?: string }>>([
  ['Home', Home],
  ['Wrench', Wrench],
  ['Shield', Shield],
  ['Users', Users],
  ['Zap', Zap],
]);

export const markdownDelays = {
  h1: 0.04,
  h2: 0.08,
  h3: 0.12,
  p: 0.16,
  list: 0.2,
  block: 0.24,
};

export const wikiPanelSurfaceStyle = {
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  background: 'var(--theme-surface-glass)',
  border: '1px solid var(--theme-border-glass)',
  boxShadow: 'var(--theme-shadow-card)',
} as const;

export const spring = {
  snappy: { type: 'spring' as const, stiffness: 500, damping: 30, mass: 0.8 },
  bouncy: { type: 'spring' as const, stiffness: 380, damping: 22, mass: 1 },
  gentle: { type: 'spring' as const, stiffness: 480, damping: 40, mass: 0.8 },
  wobbly: { type: 'spring' as const, stiffness: 280, damping: 18, mass: 0.9 },
  fab: { type: 'spring' as const, stiffness: 460, damping: 20, mass: 0.7 },
};

export const navContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

export const navItem = {
  hidden: { opacity: 0, x: -14, filter: 'blur(4px)' },
  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: spring.snappy },
};

export const popupItem = {
  hidden: { opacity: 0, y: 10, scale: 0.92, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
};
