import { createContext } from 'react';

import type { LocalizedBuilding } from '@/modules/building/model/building-types';

export interface BuildingsState {
  buildings: LocalizedBuilding[];
  isLoading: boolean;
  error: string | null;
  fetchBuildings: (options?: { force?: boolean }) => Promise<void>;
}

export const BuildingsStateContext = createContext<BuildingsState | null>(null);
