'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

import { PlayerStatusContext } from './player-status-state-context';
import type { Player } from './player-types';
import { isPlayerOnlinePayload } from './player-types';

const PLAYER_REQUEST_TIMEOUT_MS = 10_000;
const PLAYER_BROWSER_CACHE_TTL_MS = 8_000;
const BASE_POLL_DELAY_MS = 10_000;
const MAX_RETRIES = 3;

export function PlayerStatusProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [peakPlayerCount, setPeakPlayerCount] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    let active = true;
    let fetching = false;
    let retries = 0;
    let lastUpdatedAt: number | null = null;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      clearTimer();
      if (active && !document.hidden) {
        const delay = BASE_POLL_DELAY_MS * (retries >= MAX_RETRIES ? 4 : 1.5 ** retries);
        timer = window.setTimeout(() => void fetchPlayers(), delay);
      }
    };
    const resetPlayersState = () => {
      setPlayers([]);
      setPlayerCount(0);
      setPeakPlayerCount(null);
    };
    const fetchPlayers = async () => {
      if (!active || document.hidden || fetching) return;
      clearTimer();
      fetching = true;
      const result = await fetchValidatedJson({
        url: dataApiUrl('/players'),
        validate: isPlayerOnlinePayload,
        timeoutMs: PLAYER_REQUEST_TIMEOUT_MS,
        cache: 'no-store',
        browserCache: { ttlMs: PLAYER_BROWSER_CACHE_TTL_MS },
        fallbackErrorMessage: 'Failed to load player data',
        invalidDataMessage: 'Invalid player data format',
      });
      if (!active) return;
      if (result.status === 'success') {
        const online = result.data.online !== -1;
        setIsOnline(online);
        setNetworkError(false);
        if (online) {
          setPlayers(result.data.players);
          setPlayerCount(result.data.online);
          setPeakPlayerCount(result.data.peak_online ?? null);
        } else resetPlayersState();
        lastUpdatedAt = Date.now();
        retries = 0;
      } else {
        setIsOnline(false);
        // A failed status service does not establish that the Minecraft server is offline.
        setNetworkError(true);
        resetPlayersState();
        retries++;
      }
      setIsLoading(false);
      fetching = false;
      // Schedule after completion so failure backoff actually applies and requests never overlap.
      schedule();
    };
    const handleVisibilityChange = () => {
      clearTimer();
      if (document.hidden) return;
      if (lastUpdatedAt === null || Date.now() - lastUpdatedAt > BASE_POLL_DELAY_MS)
        void fetchPlayers();
      else schedule();
    };

    if (!document.hidden) timer = window.setTimeout(() => void fetchPlayers(), 0);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <PlayerStatusContext.Provider
      value={{ players, playerCount, peakPlayerCount, isOnline, isLoading, networkError }}
    >
      {children}
    </PlayerStatusContext.Provider>
  );
}
