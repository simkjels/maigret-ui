import { SearchStatusResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Loader2, Search, Globe } from 'lucide-react';

interface SearchProgressProps {
  status: SearchStatusResponse | null;
  isSearching: boolean;
}

export function SearchProgress({ status, isSearching }: SearchProgressProps) {
  console.log('SearchProgress render:', { status, isSearching, statusType: typeof status, statusKeys: status ? Object.keys(status) : null });

  if (!isSearching && !status) {
    console.log('SearchProgress: Not showing - not searching and no status');
    return null;
  }

  const getStatusIcon = () => {
    if (!status) return <Loader2 className="h-4 w-4 animate-spin" />;
    
    switch (status.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    if (!status) return 'bg-blue-500';
    
    switch (status.status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressText = () => {
    if (!status) return "Initializing search...";
    
    if (status.status === 'completed') return "Search completed!";
    if (status.status === 'failed') return "Search failed";
    
    if (status.progress === 0) return "Starting search...";
    if (status.progress < 10) return "Initializing sites...";
    if (status.progress < 50) return "Searching sites...";
    if (status.progress < 90) return "Processing results...";
    return "Finalizing results...";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-lg bg-background/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">Search Progress</span>
            </div>
            {status && (
              <Badge variant="outline" className="capitalize">
                {status.status}
              </Badge>
            )}
          </div>

          {status && status.progress > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(status.progress)}%</span>
                </div>
                <Progress value={status.progress} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold">{status.sitesChecked}</div>
                  <div className="text-muted-foreground text-xs">Checked</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{status.totalSites}</div>
                  <div className="text-muted-foreground text-xs">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{status.resultsFound}</div>
                  <div className="text-muted-foreground text-xs">Found</div>
                </div>
              </div>

              {status.currentSite && (
                <div className="text-sm text-muted-foreground text-center">
                  <Globe className="h-3 w-3 inline mr-1" />
                  Checking: <span className="font-mono">{status.currentSite}</span>
                </div>
              )}
              
              {status.sitesChecked > 0 && status.totalSites > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  {status.sitesChecked} of {status.totalSites} sites checked
                  {status.resultsFound > 0 && ` • ${status.resultsFound} results found`}
                </div>
              )}
            </>
          )}

          {(!status || (status && status.progress === 0)) && isSearching && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {getProgressText()}
              </p>
            </div>
          )}

          {status && status.progress > 0 && status.progress < 100 && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                {getProgressText()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}