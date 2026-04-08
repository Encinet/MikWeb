import type { LucideIcon } from 'lucide-react';

export interface SiteHeaderNavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path?: string;
  link?: string;
  highlight?: boolean;
}
