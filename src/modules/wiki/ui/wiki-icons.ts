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
