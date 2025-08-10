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
    console.log('SearchPage useEffect - checking redirect:', { currentSession, status });
    if (currentSession && status === 'completed') {
      console.log('Redirecting to results page');
      router.push(`/results/${currentSession.id}`);
    }
  }, [currentSession, status, router]);

  const handleSearch = async (usernames: string[], options: any) => {
    console.log('SearchPage handleSearch called with:', { usernames, options });
    await startSearch(usernames, options);
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
        </div>
      </div>
    </Layout>
  );
}
