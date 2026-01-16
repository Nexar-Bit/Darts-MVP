/**
 * API Client Configuration
 * 
 * Centralized API client for making requests to the AI backend.
 * Handles base URL configuration, authentication, and error handling.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE;
}

/**
 * Convert a relative URL to an absolute URL
 * If the URL already starts with http, return as-is
 * Otherwise, prepend the API base URL
 */
export function absUrl(maybeRelative: string): string {
  if (!maybeRelative) return '';
  if (maybeRelative.startsWith('http')) return maybeRelative;
  return `${API_BASE}${maybeRelative}`;
}

/**
 * API Client class for making requests to the backend
 */
export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || API_BASE;
    this.apiKey = apiKey || process.env.AI_BACKEND_API_KEY;
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, options?: RequestInit & { cacheTtlMs?: number; cacheKey?: string; cache?: boolean }): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, body?: any, options?: RequestInit & { cacheTtlMs?: number; cacheKey?: string; cache?: boolean }): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    });
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, body?: any, options?: RequestInit & { cacheTtlMs?: number; cacheKey?: string; cache?: boolean }): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit & { cacheTtlMs?: number; cacheKey?: string; cache?: boolean }): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Make a request with error handling
   */
  private async request<T>(endpoint: string, options?: RequestInit & { cacheTtlMs?: number; cacheKey?: string; cache?: boolean }): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      ...options?.headers,
    };

    const method = (options?.method || 'GET').toUpperCase();
    const cacheEnabled = method === 'GET' && options?.cache !== false;
    const cacheTtlMs = typeof options?.cacheTtlMs === 'number' ? options.cacheTtlMs : 3000;
    const cacheKey = options?.cacheKey || this.buildCacheKey(method, url, headers);

    if (cacheEnabled && cacheTtlMs > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: ${response.statusText}` 
        }));
        throw new ApiError(
          errorData.error || errorData.message || 'Request failed',
          response.status,
          errorData
        );
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const data = await response.json();

      if (cacheEnabled && cacheTtlMs > 0) {
        this.cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + cacheTtlMs,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Enhanced network error detection
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Network connection failed. Please check your internet connection.',
          0,
          { originalError: error }
        );
      }
      
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new ApiError(
          'Request timed out. Please try again.',
          0,
          { originalError: error }
        );
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        { originalError: error }
      );
    }
  }

  private buildCacheKey(method: string, url: string, headers: HeadersInit): string {
    let headerKey = '';
    if (headers instanceof Headers) {
      headerKey = JSON.stringify(Object.fromEntries(headers.entries()));
    } else if (Array.isArray(headers)) {
      headerKey = JSON.stringify(Object.fromEntries(headers));
    } else if (headers) {
      headerKey = JSON.stringify(headers);
    }
    return `${method}:${url}:${headerKey}`;
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Create a new API client with custom configuration
 */
export function createApiClient(baseUrl?: string, apiKey?: string): ApiClient {
  return new ApiClient(baseUrl, apiKey);
}
