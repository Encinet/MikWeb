import { createContext } from 'react';

import type { Building } from '@/modules/building/model/building-types';

export interface BuildingsState {
  buildings: Building[];
  buildingCount: number;
  isLoading: boolean;
  error: string | null;
  fetchBuildings: (options?: { force?: boolean }) => Promise<void>;
  lastUpdatedAt: number | null;
}

export const BuildingsStateContext = createContext<BuildingsState | null>(null);
