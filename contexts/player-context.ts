import { createContext } from 'react';

import type { PlayerContextValue } from '@/lib/types';

const defaultPlayerContextValue: PlayerContextValue = {
  players: [],
  playerCount: 0,
  isOnline: true,
  isLoading: true,
  networkError: false,
};

export const PlayerContext = createContext<PlayerContextValue>(defaultPlayerContextValue);
