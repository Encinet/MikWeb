'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef,useState } from 'react';

interface Player {
  name: string;
  uuid: string;
}

interface PlayerContextType {
  players: Player[];
  playerCount: number;
  isOnline: boolean;
  isLoading: boolean;
  networkError: boolean;
}

const PlayerContext = createContext<PlayerContextType>({
  players: [],
  playerCount: 0,
  isOnline: true,
  isLoading: true,
  networkError: false,
});

export const usePlayerContext = () => useContext(PlayerContext);

export function PlayerContextProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  
  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastUpdatedRef = useRef<number | null>(null);
  
  const maxRetries = 3;
  const baseDelay = 10000; // 10 seconds
  
  const getNextInterval = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      return baseDelay * 4; // 2 minutes if multiple failures
    }
    return baseDelay * Math.pow(1.5, Math.min(retryCountRef.current, 3));
  }, []);
  
  const fetchPlayers = useCallback(async () => {
    // Skip fetch if page is not visible or already fetching
    if (!isVisibleRef.current || isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('/api/players', {
        signal: controller.signal,
        cache: 'no-store' // Disable cache to get fresh data
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        setIsOnline(false);
        setNetworkError(false);
        setPlayers([]);
        setPlayerCount(0);
        retryCountRef.current++;
      } else if (data.count === -1) {
        setIsOnline(false);
        setNetworkError(false);
        setPlayers([]);
        setPlayerCount(0);
        lastUpdatedRef.current = Date.now();
        retryCountRef.current = 0;
      } else {
        setIsOnline(true);
        setNetworkError(false);
        setPlayers(data.players || []);
        setPlayerCount(data.count || 0);
        lastUpdatedRef.current = Date.now();
        retryCountRef.current = 0;
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      setIsOnline(false);
      setNetworkError(true);
      setPlayers([]);
      setPlayerCount(0);
      setIsLoading(false);
      retryCountRef.current++;
    } finally {
      isFetchingRef.current = false;
    }
  }, []);
  
  useEffect(() => {
    // Initial fetch
    fetchPlayers();
    
    // Setup interval with dynamic delay
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(fetchPlayers, getNextInterval());
    };
    
    setupInterval();
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (!document.hidden) {
        // Page became visible, fetch immediately if data is stale
        const now = Date.now();
        if (!lastUpdatedRef.current || now - lastUpdatedRef.current > baseDelay) {
          fetchPlayers();
        }
        setupInterval();
      } else {
        // Page hidden, clear interval to save resources
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    
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
