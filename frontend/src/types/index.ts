// Core data types for the Maigret OSINT tool

export interface SearchSession {
  id: string;
  usernames: string[];
  options: SearchOptions;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results: SearchResult[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SearchOptions {
  topSites: number;
  timeout: number;
  useCookies: boolean;
  allSites: boolean;
  disableRecursiveSearch: boolean;
  disableExtracting: boolean;
  withDomains: boolean;
  proxy?: string;
  torProxy?: string;
  i2pProxy?: string;
  permute: boolean;
  tags: string[];
  siteList: string[];
}

export interface SearchResult {
  username: string;
  sites: SiteResult[];
  extractedData: ExtractedData;
  networkGraph: NetworkNode[];
}

export interface SiteResult {
  siteName: string;
  url: string;
  status: 'Claimed' | 'Unclaimed' | 'Error' | 'claimed' | 'unclaimed' | 'error';
  tags: string[];
  metadata: Record<string, unknown>;
  urlUser?: string;
  errorMessage?: string;
}

export interface ExtractedData {
  fullname?: string;
  gender?: string;
  location?: string;
  age?: number;
  bio?: string;
  email?: string;
  phone?: string;
  socialLinks?: string[];
  [key: string]: unknown;
}

export interface NetworkNode {
  id: string;
  label: string;
  group: number;
  size: number;
  type: 'username' | 'site' | 'data';
  metadata?: Record<string, unknown>;
}

export interface NetworkEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Site {
  name: string;
  urlMain: string;
  url: string;
  tags: string[];
  alexaRank?: number;
  disabled: boolean;
  type: string;
  engine?: string;
}

export interface Tag {
  name: string;
  count: number;
  category?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'html';
  includeMetadata: boolean;
  includeNetworkGraph: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultTopSites: number;
  defaultTimeout: number;
  autoExport: boolean;
  notifications: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchStatusResponse {
  sessionId: string;
  status: SearchSession['status'];
  progress: number;
  currentSite?: string;
  sitesChecked: number;
  totalSites: number;
  resultsFound: number;
  error?: string;
}

export interface SitesResponse {
  sites: Site[];
  total: number;
  tags: Tag[];
}

// WebSocket event types
export interface WebSocketEvents {
  'search:progress': SearchStatusResponse;
  'search:complete': SearchSession;
  'search:error': { sessionId: string; error: string };
}
