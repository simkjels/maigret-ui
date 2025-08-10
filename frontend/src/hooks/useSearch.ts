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
  const retryCountRef = useRef<number>(0);
  const maxRetries = 5;
  const maxPollingDuration = 30 * 60 * 1000; // 30 minutes max polling
  const pollingStartTimeRef = useRef<number>(0);

  const stopSearch = useCallback(() => {
    console.log('Stopping search');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSearching(false);
    retryCountRef.current = 0; // Reset retry count
    pollingStartTimeRef.current = 0; // Reset polling start time
  }, []);

  const refreshStatus = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      console.log('No session ID to refresh');
      return;
    }
    
    // Check if we've been polling for too long
    if (pollingStartTimeRef.current && Date.now() - pollingStartTimeRef.current > maxPollingDuration) {
      console.error('Maximum polling duration reached, stopping search');
      setError('Search has been running for too long (30 minutes). Please try starting a new search with different parameters.');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsSearching(false);
      return;
    }
    
    try {
      console.log('Refreshing status for session:', sessionId);
      const response = await apiClient.getSearchStatus(sessionId);
      console.log('Status response:', response);
      
      // Reset retry count on successful request
      retryCountRef.current = 0;
      
      if (response.success && response.data) {
        console.log('Setting searchStatus to:', response.data);
        console.log('Previous searchStatus was:', searchStatus);
        setSearchStatus(response.data);
        
        // Update currentSession status
        setCurrentSession(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            status: response.data!.status,
            progress: response.data!.progress
          };
          console.log('Updated currentSession:', updated);
          return updated;
        });
        
        console.log('Updated session status:', response.data.status, 'progress:', response.data.progress);
        
        // If search is complete or failed, stop polling
        if (response.data.status === 'completed' || response.data.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsSearching(false);
          
          // Fetch final results if completed
          if (response.data.status === 'completed') {
            const resultsResponse = await apiClient.getSearchResults(sessionId);
            if (resultsResponse.success && resultsResponse.data) {
              // Preserve the original session data and merge with results
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
          }
        }
      } else {
        // Handle specific error cases
        if (response.error?.includes('timed out')) {
          console.warn('Request timed out, will retry on next poll');
          // Don't set error for timeouts during polling - just log and continue
          return;
        }
        throw new Error(response.error || 'Failed to get search status');
      }
    } catch (err) {
      console.error('Status refresh error:', err);
      
      // Increment retry count
      retryCountRef.current += 1;
      
      // Don't stop polling for network errors or timeouts during active search
      if (isSearching && (err instanceof Error && 
          (err.message.includes('timed out') || 
           err.message.includes('fetch') || 
           err.message.includes('network')))) {
        
        if (retryCountRef.current >= maxRetries) {
          console.error(`Max retries (${maxRetries}) reached, stopping search`);
          setError(`Search failed after ${maxRetries} retry attempts. Please try starting a new search.`);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsSearching(false);
          return;
        }
        
        console.warn(`Network error during polling (attempt ${retryCountRef.current}/${maxRetries}), will retry on next poll`);
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Failed to refresh status');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsSearching(false);
    }
  }, [isSearching, currentSession, searchStatus]);

  const startSearch = useCallback(async (usernames: string[], options: SearchOptions) => {
    try {
      console.log('Starting search with:', { usernames, options });
      setError(null);
      setIsSearching(true);
      setSearchStatus(null);
      
      // Reset retry count for new search
      retryCountRef.current = 0;
      
      const response = await apiClient.startSearch(usernames, options);
      console.log('Search start response:', response);
      
      if (!response.success || !response.data) {
        // Handle specific error cases
        if (response.error?.includes('timed out')) {
          throw new Error('Search request timed out. The server might be busy or the search is taking longer than expected. Please try again.');
        }
        throw new Error(response.error || 'Failed to start search');
      }
      
      setCurrentSession(response.data);
      sessionIdRef.current = response.data.id;
      console.log('Search session created:', response.data);
      
      // Check status immediately to get initial state
      await refreshStatus();
      
      // Start polling for status updates
      const interval = setInterval(() => {
        console.log('Polling interval triggered');
        refreshStatus();
      }, 1000); // Poll every 1 second for more frequent updates
      
      intervalRef.current = interval;
      pollingStartTimeRef.current = Date.now(); // Set start time for polling duration check
      console.log('Polling interval set:', interval);
      
    } catch (err) {
      console.error('Search start error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Provide more helpful error messages
      if (errorMessage.includes('timed out')) {
        setError('The search request timed out. This might happen if the server is busy or the search is taking longer than expected. Please try again.');
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setError('Network error: Unable to connect to the search server. Please check if the backend is running and try again.');
      } else {
        setError(errorMessage);
      }
      
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
