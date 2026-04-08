import { createContext } from 'react';

import type { PlayerContextValue } from '@/modules/player/model/player-types';

const defaultPlayerContextValue: PlayerContextValue = {
  players: [],
  playerCount: 0,
  isOnline: true,
  isLoading: true,
  networkError: false,
};

export const PlayerStatusContext = createContext<PlayerContextValue>(defaultPlayerContextValue);
