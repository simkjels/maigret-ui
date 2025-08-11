import { SearchStatusResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
      <Card className="w-full max-w-2xl mx-auto border-0 shadow-lg bg-blue-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-center gap-3 text-blue-700">
            <div className="relative">
              <Search className="h-6 w-6 text-blue-500" />
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin absolute -top-1 -right-1" />
            </div>
            Starting search…
          </CardTitle>
          <CardDescription className="text-center">Preparing the search environment</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show completion status
  if (status?.status === 'completed') {
    return (
      <Alert className="w-full max-w-2xl mx-auto bg-green-50 border-green-200">
        <CheckCircle className="text-green-600" />
        <AlertTitle className="text-green-700">Search completed successfully!</AlertTitle>
        <AlertDescription className="text-green-600">
          Redirecting to results...
        </AlertDescription>
      </Alert>
    );
  }

  // Show error status
  if (status?.status === 'failed') {
    return (
      <Card className="w-full max-w-2xl mx-auto border-0 shadow-lg bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-700">Search failed</p>
              <p className="text-sm text-red-600 mt-1">{status.error || "Please try again"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show active search with progress and stats
  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-lg bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-center gap-3 text-blue-700">
          <div className="relative">
            <Search className="h-6 w-6 text-blue-500" />
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin absolute -top-1 -right-1" />
          </div>
          Searching
          <Badge className="bg-blue-600 text-white">Running</Badge>
        </CardTitle>
        <CardDescription className="text-center">Real-time progress as we check sites</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-600">
            <span>Progress</span>
            <span>{percentComplete}%</span>
          </div>
          <Progress value={percentComplete} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md bg-white/70 p-3 text-center">
            <div className="text-[11px] uppercase tracking-wide text-blue-500">Sites Checked</div>
            <div className="mt-1 font-semibold text-blue-900">
              {status?.sitesChecked ?? 0}
              {typeof status?.totalSites === 'number' && (
                <span className="text-blue-500">/{status?.totalSites}</span>
              )}
            </div>
          </div>
          <div className="rounded-md bg-white/70 p-3 text-center">
            <div className="text-[11px] uppercase tracking-wide text-blue-500">Results Found</div>
            <div className="mt-1 font-semibold text-blue-900">{status?.resultsFound ?? 0}</div>
          </div>
          <div className="rounded-md bg-white/70 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-blue-500">
              <Clock className="h-3 w-3" /> Elapsed
            </div>
            <div className="mt-1 font-semibold text-blue-900">
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <div className="rounded-md bg-white/70 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-blue-500">
              <Globe className="h-3 w-3" /> Current Site
            </div>
            <div className="mt-1 font-semibold text-blue-900 truncate" title={status?.currentSite || ''}>
              {status?.currentSite || '—'}
            </div>
          </div>
        </div>

        {/* Message and hint */}
        <div className="text-center space-y-1">
          <p className="text-sm text-blue-700 font-medium">{loadingMessages[currentMessage]}</p>
          <p className="text-xs text-blue-500">
            {elapsedTime < 30
              ? 'This usually takes 30-60 seconds...'
              : elapsedTime < 120
              ? 'Still searching, please wait...'
              : 'Large search in progress, this may take a few minutes...'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}