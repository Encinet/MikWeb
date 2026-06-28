import { createContext } from 'react';

import type { BuildingsContextValue } from '@/modules/building/model/building-types';

const defaultBuildingsContextValue: BuildingsContextValue = {
  buildings: [],
  buildingCount: 0,
  isLoading: false,
  error: null,
  fetchBuildings: async () => undefined,
  lastUpdatedAt: null,
};

export const BuildingsStateContext = createContext<BuildingsContextValue>(
  defaultBuildingsContextValue,
);
