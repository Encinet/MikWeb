import { createContext } from 'react';

import type { Player } from '@/modules/player/model/player-types';

export interface PlayerStatusState {
  players: Player[];
  playerCount: number;
  isOnline: boolean;
  isLoading: boolean;
  hasNetworkError: boolean;
}

const defaultPlayerStatusState: PlayerStatusState = {
  players: [],
  playerCount: 0,
  isOnline: true,
  isLoading: true,
  hasNetworkError: false,
};

export const PlayerStatusContext = createContext<PlayerStatusState>(defaultPlayerStatusState);
