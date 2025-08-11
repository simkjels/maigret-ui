import { useState, useCallback, useEffect, useRef } from 'react';
import { SearchSession, SearchOptions, SearchStatusResponse } from '@/types';
import apiClient from '@/lib/api';

interface UseSearchReturn {
  // State
  currentSession: SearchSession | null;
  searchStatus: SearchStatusResponse | null;
  isSearching: boolean;
  error: string | null;
  
  // Actions
  startSearch: (usernames: string[], options: SearchOptions) => Promise<void>;
  stopSearch: () => void;
  refreshStatus: () => Promise<void>;
  
  // Computed
  progress: number;
  status: SearchSession['status'];
}

export function useSearch(): UseSearchReturn {
  const [currentSession, setCurrentSession] = useState<SearchSession | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatusResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const stopSearch = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSearching(false);
  }, []);

  const refreshStatus = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    
    try {
      const response = await apiClient.getSearchStatus(sessionId);
      
      if (response.success && response.data) {
        setSearchStatus(response.data);
        
        // Update currentSession status
        setCurrentSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: response.data!.status,
            progress: response.data!.progress
          };
        });
        
        // If search is complete or failed, stop polling
        if (response.data.status === 'completed' || response.data.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsSearching(false);
          
          // Fetch final results if completed
          if (response.data.status === 'completed') {
            try {
              const resultsResponse = await apiClient.getSearchResults(sessionId);
              if (resultsResponse.success && resultsResponse.data) {
                setCurrentSession(prev => {
                  if (!prev) return resultsResponse.data || null;
                  return {
                    ...prev,
                    ...resultsResponse.data,
                    status: 'completed' as const,
                    progress: 100
                  };
                });
              }
            } catch (error) {
              console.error('Failed to fetch results:', error);
            }
          }
        }
      }
    } catch (err) {
      console.error('Status refresh error:', err);
      // Don't set error during polling - just log it
      // The search may still complete successfully
    }
  }, []);

  const startSearch = useCallback(async (usernames: string[], options: SearchOptions) => {
    try {
      setError(null);
      setIsSearching(true);
      setSearchStatus(null);
      
      const response = await apiClient.startSearch(usernames, options);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to start search');
      }
      
      setCurrentSession(response.data);
      sessionIdRef.current = response.data.id;

      // Kick off an immediate status refresh so UI updates right away
      await refreshStatus();

      // Start faster polling for smoother progress updates
      const interval = setInterval(() => {
        refreshStatus();
      }, 1000);

      intervalRef.current = interval;
      
    } catch (err) {
      console.error('Search start error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start search');
      setIsSearching(false);
    }
  }, [refreshStatus]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    currentSession,
    searchStatus,
    isSearching,
    error,
    startSearch,
    stopSearch,
    refreshStatus,
    progress: searchStatus?.progress || 0,
    status: currentSession?.status || 'pending',
  };
}
