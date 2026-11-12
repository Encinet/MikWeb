import { createContext } from 'react';

import type { Player } from '@/modules/player/model/player-types';

export interface PlayerStatusState {
  players: Player[];
  playerCount: number;
  peakPlayerCount: number | null;
  isOnline: boolean;
  isLoading: boolean;
  hasNetworkError: boolean;
}

const defaultPlayerStatusState: PlayerStatusState = {
  players: [],
  playerCount: 0,
  peakPlayerCount: null,
  isOnline: true,
  isLoading: true,
  hasNetworkError: false,
};

export const PlayerStatusContext = createContext<PlayerStatusState>(defaultPlayerStatusState);
