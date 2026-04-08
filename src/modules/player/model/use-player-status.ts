'use client';

import { useContext } from 'react';

import type { PlayerContextValue } from '@/modules/player/model/player-types';

import { PlayerStatusContext } from './player-status-state-context';

export function usePlayerStatus(): PlayerContextValue {
  return useContext(PlayerStatusContext);
}
