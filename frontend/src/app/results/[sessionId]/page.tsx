'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchSession, SiteResult } from '@/types';
import apiClient from '@/lib/api';
import { Download, ExternalLink, User, Globe } from 'lucide-react';

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SearchSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getSearchResults(sessionId);
        
        if (response.success && response.data) {
          setSession(response.data);
        } else {
          setError(response.error || 'Failed to load results');
        }
      } catch (err) {
        setError('Failed to load search results');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  const handleExport = async (format: 'csv' | 'json' | 'pdf' | 'html') => {
    try {
      const response = await apiClient.exportResults(sessionId, format);
      if (response.success && response.data) {
        // Create download link
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = `maigret-results-${sessionId}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getStatusBadge = (status: SiteResult['status']) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'claimed':
        return <Badge className="bg-green-500">Found</Badge>;
      case 'unclaimed':
        return <Badge variant="secondary">Not Found</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">Loading results...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !session) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600">Error: {error || 'Results not found'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const claimedSites = session.results.flatMap(result => 
    result.sites.filter(site => site.status.toLowerCase() === 'claimed')
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
          <p className="text-muted-foreground">
            Results for {session.usernames.join(', ')} - {session.results.length} profiles found
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{session.usernames.length}</div>
              <div className="text-muted-foreground">Usernames Searched</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{claimedSites.length}</div>
              <div className="text-muted-foreground">Profiles Found</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{session.options.topSites}</div>
              <div className="text-muted-foreground">Sites Checked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {session.completedAt ? 
                  new Date(session.completedAt).toLocaleTimeString() : 
                  'N/A'
                }
              </div>
              <div className="text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleExport('csv')}>
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('json')}>
                Export JSON
              </Button>
              <Button variant="outline" onClick={() => handleExport('pdf')}>
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => handleExport('html')}>
                Export HTML
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Tabs */}
        <Tabs defaultValue="profiles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profiles">Profiles Found</TabsTrigger>
            <TabsTrigger value="all">All Results</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="space-y-4">
            {claimedSites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {claimedSites.map((site, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="font-medium">{site.siteName}</span>
                        </div>
                        {getStatusBadge(site.status)}
                      </div>
                      
                      {site.urlUser && (
                        <div className="mb-2">
                          <a
                            href={site.urlUser}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit Profile
                          </a>
                        </div>
                      )}

                      {site.tags && site.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {site.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No profiles found for the searched usernames.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {session.results.map((result, resultIndex) => (
              <Card key={resultIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {result.username}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.sites.map((site, siteIndex) => (
                      <div key={siteIndex} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{site.siteName}</span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(site.status)}
                          {site.urlUser && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={site.urlUser} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
