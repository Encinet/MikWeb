'use client';

import React, { createContext, useCallback,useContext, useState } from 'react';

export type BuildType = 'original' | 'derivative' | 'replica';

export interface Builder {
  name: string;
  uuid: string;
  weight: number;
}

export interface Building {
  name: {
    [locale: string]: string;
  };
  description: {
    [locale: string]: string;
  };
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  builders: Builder[];
  buildType: BuildType;
  images: string[];
  buildDate: string;
  tags?: {
    [locale: string]: string;
  }[];
  source?: {
    originalAuthor?: string;
    originalLink?: string;
    notes?: {
      [locale: string]: string;
    };
  } | null;
}

interface BuildingsContextType {
  buildings: Building[];
  buildingsCount: number;
  isLoading: boolean;
  error: string | null;
  fetchBuildings: () => Promise<void>;
  lastUpdated: number | null;
}

const BuildingsContext = createContext<BuildingsContextType>({
  buildings: [],
  buildingsCount: 0,
  isLoading: false,
  error: null,
  fetchBuildings: async () => {},
  lastUpdated: null,
});

export const useBuildingsContext = () => useContext(BuildingsContext);

export function BuildingsContextProvider({ children }: { children: React.ReactNode }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const fetchBuildings = useCallback(async () => {
    // Don't fetch if already loading or data is fresh (< 5 minutes)
    const now = Date.now();
    if (isLoading || (lastUpdated && now - lastUpdated < 300000)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for larger data
      
      const response = await fetch('/api/buildings', {
        signal: controller.signal,
        cache: 'default'
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        setError(data.message || 'Failed to load buildings');
        setBuildings([]);
      } else if (Array.isArray(data)) {
        setBuildings(data);
        setError(null);
        setLastUpdated(now);
      } else {
        setError('Invalid data format');
        setBuildings([]);
      }
    } catch (error) {
      console.error('Failed to fetch buildings:', error);
      setError('Network error occurred');
      setBuildings([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lastUpdated]);
  
  const buildingsCount = buildings.length;
  
  return (
    <BuildingsContext.Provider value={{ buildings, buildingsCount, isLoading, error, fetchBuildings, lastUpdated }}>
      {children}
    </BuildingsContext.Provider>
  );
}
