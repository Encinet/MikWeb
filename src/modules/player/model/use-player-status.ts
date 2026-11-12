'use client';

import { useContext } from 'react';

import type { PlayerStatusState } from '@/modules/player/model/player-status-state-context';

import { PlayerStatusContext } from './player-status-state-context';

export function usePlayerStatus(): PlayerStatusState {
  return useContext(PlayerStatusContext);
}
