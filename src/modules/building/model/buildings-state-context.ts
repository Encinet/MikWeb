import { createContext } from 'react';

import type { Building } from '@/modules/building/model/building-types';

export interface BuildingsState {
  buildings: Building[];
  isLoading: boolean;
  error: string | null;
  fetchBuildings: (options?: { force?: boolean }) => Promise<void>;
}

export const BuildingsStateContext = createContext<BuildingsState | null>(null);
