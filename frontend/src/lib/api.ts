import { SearchSession, SearchOptions, SitesResponse, ApiResponse, SearchStatusResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      console.log('Making API request to:', url);
      
      // Add timeout to the fetch request - increased to 60 seconds for long searches
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out after 60 seconds',
        };
      }
      if (error instanceof Error && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Unable to connect to the server. Please check if the backend is running.',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Search endpoints
  async startSearch(usernames: string[], options: SearchOptions): Promise<ApiResponse<SearchSession>> {
    return this.request<SearchSession>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ usernames, options }),
    });
  }

  async getSearchStatus(sessionId: string): Promise<ApiResponse<SearchStatusResponse>> {
    return this.request<SearchStatusResponse>(`/api/search/${sessionId}`);
  }

  async getSearchResults(sessionId: string): Promise<ApiResponse<SearchSession>> {
    return this.request<SearchSession>(`/api/results/${sessionId}`);
  }

  // Sites and tags endpoints
  async getSites(): Promise<ApiResponse<SitesResponse>> {
    return this.request<SitesResponse>('/api/sites');
  }

  async getTags(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/api/tags');
  }

  // Export endpoints
  async exportResults(
    sessionId: string,
    format: 'csv' | 'json' | 'pdf' | 'html'
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.request<{ downloadUrl: string }>('/api/export', {
      method: 'POST',
      body: JSON.stringify({ sessionId, format }),
    });
  }

  // Download file
  async downloadFile(filename: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/reports/${filename}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/api/health');
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export for use in components
export default apiClient;
