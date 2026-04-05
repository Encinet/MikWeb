'use client';

import { useContext } from 'react';

import { BuildingsContext } from '@/contexts/buildings-context';
import type { BuildingsContextValue } from '@/lib/types';

export function useBuildingsContext(): BuildingsContextValue {
  return useContext(BuildingsContext);
}
