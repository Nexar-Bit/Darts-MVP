import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache for job status responses (5 seconds TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

/**
 * API Proxy Route: /api/proxy/jobs/[jobId]
 * 
 * Proxies job status polling requests to the backend API with:
 * - Authentication validation
 * - Response caching (5 seconds)
 * - CORS headers
 * - Error handling
 * 
 * This route reduces backend load by caching responses for a short period,
 * which is appropriate for polling scenarios.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 1: Validate authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing access token' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 2: Verify user authentication
    const supabase = createSupabaseServerClientWithAuth(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 3: Check cache first
    const cacheKey = `${user.id}:${jobId}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // Return cached response
      return NextResponse.json(
        cached.data,
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-Cache': 'HIT',
            'Cache-Control': 'private, max-age=5',
          },
        }
      );
    }

    // Step 4: Get backend API URL
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.AI_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend API URL not configured' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 5: Forward request to backend API
    const backendResponse = await fetch(`${backendUrl}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        // Include API key if configured
        ...(process.env.AI_BACKEND_API_KEY && {
          'X-API-Key': process.env.AI_BACKEND_API_KEY,
        }),
        // Include user ID in headers for backend tracking
        'X-User-ID': user.id,
        // Forward authorization token if backend supports it
        ...(token && {
          'Authorization': `Bearer ${token}`,
        }),
      },
    });

    // Step 6: Handle backend response
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Backend API error' };
      }

      return NextResponse.json(
        { 
          error: errorData.error || 'Backend API error',
          details: errorData.details,
        },
        { 
          status: backendResponse.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 7: Parse backend response
    const backendData = await backendResponse.json();

    // Step 8: Cache the response
    cache.set(cacheKey, {
      data: backendData,
      timestamp: now,
    });

    // Clean up old cache entries (keep cache size manageable)
    if (cache.size > 1000) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      // Remove oldest 100 entries
      entries.slice(0, 100).forEach(([key]) => cache.delete(key));
    }

    // Step 9: Return response
    return NextResponse.json(
      backendData,
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=5',
        },
      }
    );
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
