import { createContext } from 'react';

import type { BuildingsContextValue } from '@/lib/types';

const defaultBuildingsContextValue: BuildingsContextValue = {
  buildings: [],
  buildingCount: 0,
  isLoading: false,
  error: null,
  fetchBuildings: async () => {},
  lastUpdatedAt: null,
};

export const BuildingsContext = createContext<BuildingsContextValue>(defaultBuildingsContextValue);
