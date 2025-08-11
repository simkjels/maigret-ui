'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SimpleSearchForm } from '@/components/search/SimpleSearchForm';
import { SearchProgress } from '@/components/search/SearchProgress';
import { useSearch } from '@/hooks/useSearch';

export default function SearchPage() {
  const router = useRouter();
  const { currentSession, searchStatus, isSearching, error, startSearch, stopSearch, progress, status } = useSearch();

  console.log('SearchPage render:', { currentSession, searchStatus, isSearching, error, progress, status });

  // Handle search completion
  useEffect(() => {
    console.log('SearchPage useEffect - checking completion:', {
      currentSession: currentSession?.id,
      status,
      searchStatus: searchStatus?.status,
      isSearching,
      hasSession: !!currentSession?.id,
      currentSessionStatus: currentSession?.status,
      searchStatusStatus: searchStatus?.status
    });

    // Check multiple conditions for completion or failure
    const currentSessionCompleted = currentSession && (currentSession.status === 'completed' || currentSession.status === 'failed');
    const searchStatusCompleted = searchStatus && (searchStatus.status === 'completed' || searchStatus.status === 'failed');
    const statusCompleted = status === 'completed' || status === 'failed';

    console.log('SearchPage useEffect - isFinished:', currentSessionCompleted || searchStatusCompleted || statusCompleted);

    if ((currentSessionCompleted || searchStatusCompleted || statusCompleted) && currentSession?.id) {
      console.log('SearchPage useEffect - redirecting to results:', currentSession.id);
      
      // Stop polling before redirecting to prevent errors
      stopSearch();
      
      // Add a small delay to ensure state is fully updated
      setTimeout(() => {
        router.push(`/results/${currentSession.id}`);
      }, 200);
    }
  }, [currentSession, status, searchStatus, isSearching, router, stopSearch]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Username Search</h1>
          <p className="text-lg text-gray-600">
            Search for usernames across multiple platforms and social media sites
          </p>
        </div>

        <SimpleSearchForm
          onSearch={startSearch}
          isSearching={isSearching}
        />

        <SearchProgress
          status={searchStatus}
          isSearching={isSearching}
        />
      </div>
    </div>
  );
}
