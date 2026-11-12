'use client';

import { useContext } from 'react';

import type { BuildingsState } from '@/modules/building/model/buildings-state-context';

import { BuildingsStateContext } from './buildings-state-context';

export function useBuildings(): BuildingsState {
  const context = useContext(BuildingsStateContext);
  if (!context) throw new Error('useBuildings requires a BuildingsProvider');
  return context;
}
