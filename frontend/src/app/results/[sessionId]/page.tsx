'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchSession, SiteResult, SearchStatusResponse } from '@/types';
import apiClient from '@/lib/api';
import { Download, ExternalLink, User, Globe, Filter, Search as SearchIcon } from 'lucide-react';

export default function ResultsPage() {
  const params = useParams();
  const sessionId = useMemo(() => {
    const raw = (params as Record<string, unknown>)?.sessionId;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.length > 0) return String(raw[0]);
    return '';
  }, [params]);
  const [session, setSession] = useState<SearchSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SearchStatusResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'claimed' | 'unclaimed' | 'error'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');

  useEffect(() => {

    if (!sessionId) {
      setLoading(false);
      setError('Invalid session id');
      return;
    }

    // Poll status until completed, then fetch results once
    let stopped = false;
    setLoading(true);
    setError(null);

    const poll = async () => {
      if (stopped) return;
      const s = await apiClient.getSearchStatus(sessionId);
      if (s.success && s.data) {
        setStatus(s.data);
        if (s.data.status === 'completed') {
          const response = await apiClient.getSearchResults(sessionId);
          if (response.success && response.data) {
            const sessionData = {
              ...response.data,
              createdAt: response.data.createdAt ? new Date(response.data.createdAt) : new Date(),
              completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined
            } as SearchSession;
            setSession(sessionData);
            setLoading(false);
            return; // stop polling
          }
        } else if (s.data.status === 'failed') {
          setError('Search failed');
          setLoading(false);
          return; // stop polling
        }
      } else if (s.error) {
        // Keep polling on transient network errors
        console.warn('Status poll error:', s.error);
      }
      setTimeout(poll, 1000);
    };

    poll();

    return () => {
      stopped = true;
    };
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
    const normalizedStatus = String(status || '').toLowerCase();
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

  const normalizeStatus = (s: SiteResult['status']) => String(s || '').toLowerCase();

  const allSiteRows = useMemo(() => {
    if (!session) return [] as Array<SiteResult & { username: string }>;
    return (session.results || []).flatMap(result =>
      (result.sites || []).map(site => ({ ...site, username: result.username }))
    );
  }, [session]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allSiteRows.forEach(s => (s.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [allSiteRows]);

  const matchesFilters = useCallback((site: SiteResult & { username: string }) => {
    const statusOk = statusFilter === 'all' || normalizeStatus(site.status) === statusFilter;
    const tagOk = tagFilter === 'all' || (site.tags || []).includes(tagFilter);
    const q = query.trim().toLowerCase();
    const queryOk = q.length === 0 ||
      site.siteName.toLowerCase().includes(q) ||
      (site.username || '').toLowerCase().includes(q);
    return statusOk && tagOk && queryOk;
  }, [statusFilter, tagFilter, query]);

  const filteredClaimedRows = useMemo(() => {
    return allSiteRows.filter(r => normalizeStatus(r.status) === 'claimed').filter(matchesFilters);
  }, [allSiteRows, statusFilter, tagFilter, query, matchesFilters]);

  const filteredAllRows = useMemo(() => {
    return allSiteRows.filter(matchesFilters);
  }, [allSiteRows, statusFilter, tagFilter, query, matchesFilters]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Searching websites for user(s)...</p>
              <p className="text-sm text-muted-foreground">This can take a couple of minutes depending on your search terms and the number of sites being checked.</p>
            {status && (
              <p className="text-sm text-muted-foreground">Status: {status.status} • {status.progress}%</p>
            )}
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
            <p className="text-red-600">{error || 'Results not found'}</p>
            {error && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  const claimedSites = (session.results || []).flatMap(result => 
    (result.sites || []).filter(site => normalizeStatus(site.status) === 'claimed')
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
          <p className="text-muted-foreground">
            Results for {(session.usernames || []).join(', ')} - {(session.results || []).length} profiles found
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{(session.usernames || []).length}</div>
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
              <div className="text-2xl font-bold">{session.options?.topSites ?? 0}</div>
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

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="flex items-center gap-2 md:w-80">
                <SearchIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search site or username"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Select value={statusFilter} onValueChange={(v: 'all' | 'claimed' | 'unclaimed' | 'error') => setStatusFilter(v)}>
                  <SelectTrigger className="min-w-36">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="claimed">Found</SelectItem>
                    <SelectItem value="unclaimed">Not Found</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tag</span>
                <Select value={tagFilter} onValueChange={(v) => setTagFilter(v)}>
                  <SelectTrigger className="min-w-36">
                    <SelectValue placeholder="All tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {allTags.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:ml-auto">
                <Button variant="ghost" onClick={() => { setStatusFilter('all'); setTagFilter('all'); setQuery(''); }}>
                  Reset filters
                </Button>
              </div>
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
            {filteredClaimedRows.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClaimedRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span className="font-medium">{row.siteName}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(row.status)}</TableCell>
                          <TableCell>
                            {row.urlUser && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={row.urlUser} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                  <ExternalLink className="h-4 w-4" />
                                  Open
                                </a>
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(row.tags || []).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
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
            <Accordion type="multiple" className="w-full">
              {session.results.map((result, idx) => {
                const rows = filteredAllRows.filter(r => r.username === result.username);
                const claimedCount = rows.filter(r => normalizeStatus(r.status) === 'claimed').length;
                return (
                  <AccordionItem key={idx} value={`user-${idx}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <span className="font-medium">{result.username}</span>
                        <Badge variant="secondary" className="ml-2">{rows.length} sites</Badge>
                        {claimedCount > 0 && (
                          <Badge className="ml-1">{claimedCount} found</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {rows.length > 0 ? (
                        <Card>
                          <CardContent className="p-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Site</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Link</TableHead>
                                  <TableHead>Tags</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((row, rIdx) => (
                                  <TableRow key={rIdx}>
                                    <TableCell className="flex items-center gap-2">
                                      <Globe className="h-4 w-4" />
                                      <span className="font-medium">{row.siteName}</span>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                                    <TableCell>
                                      {row.urlUser && (
                                        <Button variant="ghost" size="sm" asChild>
                                          <a href={row.urlUser} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                            <ExternalLink className="h-4 w-4" />
                                            Open
                                          </a>
                                        </Button>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {(row.tags || []).map(tag => (
                                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="text-sm text-muted-foreground px-2">No sites match current filters.</div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
