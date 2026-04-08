'use client';

import { useContext } from 'react';

import type { BuildingsContextValue } from '@/modules/building/model/building-types';

import { BuildingsStateContext } from './buildings-state-context';

export function useBuildings(): BuildingsContextValue {
  return useContext(BuildingsStateContext);
}
