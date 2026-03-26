'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchValidatedJson } from '@/lib/clientApi';
import type { Player, PlayerContextValue } from '@/lib/types';
import { isPlayerStatusPayload } from '@/lib/types';

const PLAYER_REQUEST_TIMEOUT_MS = 10_000;
const BASE_POLL_DELAY_MS = 10_000;
const MAX_RETRIES = 3;

const defaultPlayerContextValue: PlayerContextValue = {
  players: [],
  playerCount: 0,
  isOnline: true,
  isLoading: true,
  networkError: false,
};

const PlayerContext = createContext<PlayerContextValue>(defaultPlayerContextValue);

export function usePlayerContext(): PlayerContextValue {
  return useContext(PlayerContext);
}

export function PlayerContextProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  const retryCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastUpdatedAtRef = useRef<number | null>(null);

  const resetPlayersState = useCallback(() => {
    setPlayers([]);
    setPlayerCount(0);
  }, []);

  const getNextInterval = useCallback(() => {
    if (retryCountRef.current >= MAX_RETRIES) {
      return BASE_POLL_DELAY_MS * 4;
    }

    return BASE_POLL_DELAY_MS * 1.5 ** Math.min(retryCountRef.current, 3);
  }, []);

  const fetchPlayers = useCallback(async () => {
    if (!isVisibleRef.current || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    const result = await fetchValidatedJson({
      url: '/api/players',
      validate: isPlayerStatusPayload,
      timeoutMs: PLAYER_REQUEST_TIMEOUT_MS,
      cache: 'no-store',
      fallbackErrorMessage: 'Failed to load player data',
      invalidDataMessage: 'Invalid player data format',
    });

    if (result.status === 'success' && result.data.count === -1) {
      setIsOnline(false);
      setNetworkError(false);
      resetPlayersState();
      lastUpdatedAtRef.current = Date.now();
      retryCountRef.current = 0;
    } else if (result.status === 'success') {
      setIsOnline(true);
      setNetworkError(false);
      setPlayers(result.data.players);
      setPlayerCount(result.data.count);
      lastUpdatedAtRef.current = Date.now();
      retryCountRef.current = 0;
    } else if (result.status === 'api-error' || result.status === 'http-error') {
      setIsOnline(false);
      setNetworkError(false);
      resetPlayersState();
      retryCountRef.current += 1;
    } else {
      if (result.status === 'network-error') {
        console.error('Failed to fetch players:', result.cause);
      }
      setIsOnline(false);
      setNetworkError(true);
      resetPlayersState();
      retryCountRef.current += 1;
    }

    setIsLoading(false);
    isFetchingRef.current = false;
  }, [resetPlayersState]);

  useEffect(() => {
    const setupPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(fetchPlayers, getNextInterval());
    };

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;

      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        return;
      }

      const now = Date.now();

      if (!lastUpdatedAtRef.current || now - lastUpdatedAtRef.current > BASE_POLL_DELAY_MS) {
        fetchPlayers();
      }

      setupPolling();
    };

    fetchPlayers();
    setupPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPlayers, getNextInterval]);

  return (
    <PlayerContext.Provider value={{ players, playerCount, isOnline, isLoading, networkError }}>
      {children}
    </PlayerContext.Provider>
  );
}
