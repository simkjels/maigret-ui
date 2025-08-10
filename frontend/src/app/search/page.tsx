'use client';

import { useSearch } from '@/hooks/useSearch';
import { SimpleSearchForm } from '@/components/search/SimpleSearchForm';
import { SearchProgress } from '@/components/search/SearchProgress';
import { Layout } from '@/components/layout/Layout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SearchPage() {
  const router = useRouter();
  const { 
    currentSession, 
    searchStatus, 
    isSearching, 
    error, 
    startSearch, 
    progress, 
    status 
  } = useSearch();

  console.log('SearchPage render:', { 
    currentSession, 
    searchStatus, 
    isSearching, 
    error, 
    progress, 
    status 
  });

  // Redirect to results when search is completed
  useEffect(() => {
    console.log('SearchPage useEffect - checking redirect:', { 
      currentSession, 
      status, 
      searchStatus,
      isSearching 
    });
    
    // Check multiple conditions for completion
    const isCompleted = 
      (currentSession && status === 'completed') ||
      (searchStatus && searchStatus.status === 'completed');
    
    if (isCompleted && currentSession?.id) {
      console.log('Redirecting to results page for session:', currentSession.id);
      router.push(`/results/${currentSession.id}`);
    }
  }, [currentSession, status, searchStatus, isSearching, router]);

  const handleSearch = async (usernames: string[], options: any) => {
    console.log('SearchPage handleSearch called with:', { usernames, options });
    await startSearch(usernames, options);
  };

  // Debug function to manually test redirect
  const handleManualRedirect = () => {
    if (currentSession?.id) {
      console.log('Manual redirect to:', currentSession.id);
      router.push(`/results/${currentSession.id}`);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-center">Error: {error}</p>
            </div>
          )}

          <SimpleSearchForm onSearch={handleSearch} isSearching={isSearching} />
          
          {isSearching && (
            <div className="mt-8">
              <SearchProgress status={searchStatus} isSearching={isSearching} />
            </div>
          )}

          {/* Debug section - only show when search is completed but not redirected */}
          {!isSearching && currentSession && (status === 'completed' || searchStatus?.status === 'completed') && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-center mb-2">
                Search completed but redirect failed. Session ID: {currentSession.id}
              </p>
              <div className="text-center">
                <button
                  onClick={handleManualRedirect}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Manual Redirect to Results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
