'use client';

import { useContext } from 'react';

import { PlayerContext } from '@/contexts/player-context';
import type { PlayerContextValue } from '@/lib/types';

export function usePlayerContext(): PlayerContextValue {
  return useContext(PlayerContext);
}
