import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API Proxy Route: /api/proxy/analyze
 * 
 * Proxies video upload requests to the backend API with:
 * - Authentication validation
 * - User ID inclusion
 * - CORS headers
 * - Multipart/form-data handling
 * 
 * This route acts as a secure proxy between the frontend and backend API,
 * ensuring all requests are authenticated and include user context.
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 3: Get backend API URL
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.AI_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend API URL not configured' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 4: Get form data from request
    const formData = await request.formData();
    
    // Step 5: Create new FormData for backend with user context
    const backendFormData = new FormData();
    
    // Copy all files from original form data
    const sideVideo = formData.get('side_video') as File | null;
    const frontVideo = formData.get('front_video') as File | null;
    const legacyVideo = formData.get('video') as File | null;
    const model = formData.get('model') as string | null || 'gpt-5-mini';

    if (sideVideo) {
      backendFormData.append('side_video', sideVideo);
    }
    if (frontVideo) {
      backendFormData.append('front_video', frontVideo);
    }
    if (legacyVideo && !sideVideo && !frontVideo) {
      backendFormData.append('video', legacyVideo);
    }

    // Add user context (required for backend)
    backendFormData.append('user_id', user.id);
    if (user.email) {
      backendFormData.append('user_email', user.email);
    }
    backendFormData.append('model', model);

    // Step 6: Forward request to backend API
    const backendResponse = await fetch(`${backendUrl}/analyze?model=${encodeURIComponent(model)}`, {
      method: 'POST',
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
      body: backendFormData,
    });

    // Step 7: Handle backend response
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Step 8: Parse and return backend response
    const backendData = await backendResponse.json();

    // Return job_id to frontend
    return NextResponse.json(
      {
        job_id: backendData.job_id || backendData.jobId,
        ...backendData,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
