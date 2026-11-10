import { createContext } from 'react';

import type { BuildingsContextValue } from '@/modules/building/model/building-types';

export const BuildingsStateContext = createContext<BuildingsContextValue | null>(null);
