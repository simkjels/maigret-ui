import { SearchStatusResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Loader2, Search, Clock, Globe } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface SearchProgressProps {
  status: SearchStatusResponse | null;
  isSearching: boolean;
}

export function SearchProgress({ status, isSearching }: SearchProgressProps) {
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const percentComplete = useMemo(() => {
    return Math.max(0, Math.min(100, status?.progress ?? 0));
  }, [status?.progress]);

  // Simple loading messages that cycle through
  const loadingMessages = [
    "Initializing search...",
    "Searching across social platforms...", 
    "Checking popular sites...",
    "Processing results...",
    "Gathering data from found profiles...",
    "Almost done, finalizing search..."
  ];

  // Start timing when search begins
  useEffect(() => {
    if (isSearching && !searchStartTime) {
      setSearchStartTime(Date.now());
    } else if (!isSearching) {
      setSearchStartTime(null);
      setElapsedTime(0);
      setCurrentMessage(0);
    }
  }, [isSearching, searchStartTime]);

  // Update elapsed time and cycle through messages
  useEffect(() => {
    if (!isSearching || !searchStartTime) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - searchStartTime) / 1000);
      setElapsedTime(elapsed);
      
      // Change message every 10 seconds
      const messageIndex = Math.floor(elapsed / 10) % loadingMessages.length;
      setCurrentMessage(messageIndex);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSearching, searchStartTime, loadingMessages.length]);

  // Don't show anything if not searching and no status
  if (!isSearching && !status) {
    return null;
  }

  // Initial skeleton while we wait for first status payload
  if (isSearching && !status) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-center gap-3">
            <div className="relative">
              <Search className="h-6 w-6 text-muted-foreground" />
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin absolute -top-1 -right-1" />
            </div>
            Initializing search
          </CardTitle>
          <CardDescription className="text-center">Preparing the search environment</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          {/* Shadcn skeleton pattern */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-11/12" />
            <Skeleton className="h-2 w-10/12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show completion status (shadcn Alert)
  if (status?.status === 'completed') {
    return (
      <Alert className="w-full max-w-2xl mx-auto">
        <CheckCircle />
        <AlertTitle>Search completed successfully</AlertTitle>
        <AlertDescription>Redirecting to results...</AlertDescription>
      </Alert>
    );
  }

  // Show error status (shadcn Alert destructive)
  if (status?.status === 'failed') {
    return (
      <Alert variant="destructive" className="w-full max-w-2xl mx-auto">
        <XCircle />
        <AlertTitle>Search failed</AlertTitle>
        <AlertDescription>{status.error || 'Please try again'}</AlertDescription>
      </Alert>
    );
  }

  // Show active search with progress and stats
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-center gap-3">
          <div className="relative">
            <Search className="h-6 w-6 text-muted-foreground" />
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin absolute -top-1 -right-1" />
          </div>
          Searching
          <Badge>Running</Badge>
        </CardTitle>
        <CardDescription className="text-center">We will keep you updated as the search progresses</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        {/* Current activity */}
        <div className="rounded-md bg-muted/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="truncate" title={status?.currentSite || ''}>{status?.currentSite || 'Starting…'}</span>
          </div>
        </div>

        {/* Message and hint */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">{loadingMessages[currentMessage]}</p>
          <p className="text-xs text-muted-foreground">
            {elapsedTime < 30
              ? 'This usually takes 30-60 seconds...'
              : elapsedTime < 120
              ? 'Still searching, please wait...'
              : 'Large search in progress, this may take a few minutes...'}
          </p>
          <div className="flex items-center justify-center mt-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}