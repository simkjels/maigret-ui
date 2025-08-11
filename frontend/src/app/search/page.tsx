'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SimpleSearchForm } from '@/components/search/SimpleSearchForm';
import { useSearch } from '@/hooks/useSearch';

export default function SearchPage() {
  const router = useRouter();
  const { currentSession, searchStatus, isSearching, error, startSearch, stopSearch, progress, status } = useSearch();

  console.log('SearchPage render:', { currentSession, searchStatus, isSearching, error, progress, status });

  // Note: Avoid prefetching dynamic routes in dev to prevent benign "Load failed" logs from modulepreload aborts

  // Immediately move to results once a session is created to avoid intermediate reloads
  useEffect(() => {
    if (isSearching && currentSession?.id) {
      router.replace(`/results/${currentSession.id}`);
    }
  }, [isSearching, currentSession?.id, router]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <SimpleSearchForm onSearch={startSearch} isSearching={isSearching} />
      </div>
    </div>
  );
}
