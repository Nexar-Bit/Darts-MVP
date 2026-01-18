import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes for large uploads (requires Vercel Pro plan or higher)

// Configure global fetch timeout for Node.js (undici)
// This sets the headers timeout to 10 minutes for large uploads
if (typeof globalThis !== 'undefined' && (globalThis as any).fetch) {
  // Set environment variable for undici timeout (if supported)
  process.env.UNDICI_HEADERS_TIMEOUT = '600000'; // 10 minutes
}

/**
 * Test endpoint to verify route is accessible
 */
export async function GET(request: NextRequest) {
  console.log('[proxy-upload] GET request received');
  return NextResponse.json({ 
    message: 'Proxy upload endpoint is working',
    timestamp: new Date().toISOString(),
    path: '/api/analyze/proxy-upload'
  });
}

/**
 * DEPRECATED: This proxy endpoint is no longer used.
 * 
 * Video uploads now go directly from browser to backend (https://api.prodartscoach.com)
 * to avoid Vercel's 4.5MB body size limit and 30-second headers timeout.
 * 
 * This endpoint is kept for backward compatibility but should not be used.
 * 
 * For direct uploads:
 * 1. Configure CORS on your backend - see BACKEND_CORS_SETUP.md
 * 2. Frontend uploads directly to backend /upload endpoint
 * 3. No size limits, no timeout issues
 * 
 * If you need to use this proxy (not recommended):
 * - Node.js fetch (undici) has a hardcoded 30-second headers timeout
 * - Large uploads will fail with UND_ERR_HEADERS_TIMEOUT
 * - Vercel functions have a 4.5MB body size limit
 */
export async function POST(request: NextRequest) {
  console.log('[proxy-upload] POST request received');
  try {
    // Step 1: Validate authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing access token' },
        { status: 401 }
      );
    }

    // Step 2: Verify user authentication
    const supabase = createSupabaseServerClientWithAuth(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }

    // Step 3: Get backend URL
    const aiBackendUrl = process.env.AI_BACKEND_URL || 
                         process.env.NEXT_PUBLIC_AI_BACKEND_URL || 
                         process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!aiBackendUrl) {
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const backendUploadUrl = `${aiBackendUrl}/upload`;

    // Step 4: Get job_id from query params or form data
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      );
    }

    // Step 5: Read form data and forward to backend
    // Stream files directly without buffering in memory
    const formData = await request.formData();
    
    // Reconstruct FormData for backend
    // Pass File objects directly - they're already streams in Node.js
    const backendFormData = new FormData();
    
    // Get specific fields we need
    const sideVideo = formData.get('side_video') as File | null;
    const frontVideo = formData.get('front_video') as File | null;
    const userId = formData.get('user_id') as string | null;
    const model = formData.get('model') as string | null || 'gpt-5-mini';
    
    // Add files directly - File objects are already streams, no need to buffer
    if (sideVideo) {
      backendFormData.append('side_video', sideVideo, sideVideo.name);
    }
    
    if (frontVideo) {
      backendFormData.append('front_video', frontVideo, frontVideo.name);
    }
    
    // Add metadata
    if (userId) {
      backendFormData.append('user_id', userId);
    }
    backendFormData.append('job_id', jobId);
    backendFormData.append('model', model);

    console.log(`[proxy-upload] Forwarding upload to ${backendUploadUrl} for job ${jobId}`);
    
    // Forward request to backend with increased timeout
    // Use AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 600000); // 10 minutes timeout for large uploads

    try {
      // Configure timeout via AbortController and use a longer timeout
      // Note: Node.js fetch (undici) has a default 30s headers timeout
      // We'll use AbortController to handle our own timeout, but the underlying
      // undici timeout may still trigger. For production, consider direct uploads.
      
      const backendResponse = await fetch(backendUploadUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'X-User-ID': user.id,
          ...(process.env.AI_BACKEND_API_KEY && {
            'X-API-Key': process.env.AI_BACKEND_API_KEY,
          }),
          ...(token && {
            'Authorization': `Bearer ${token}`,
          }),
          // Don't set Content-Type - fetch will set it with boundary automatically
        },
        body: backendFormData,
      });
      
      clearTimeout(timeoutId);

      // Check if backend request was successful
      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({ 
          error: `Backend error: ${backendResponse.status} ${backendResponse.statusText}` 
        }));
        
        console.error(`[proxy-upload] Backend error: ${backendResponse.status}`, errorData);
        return NextResponse.json(
          { error: errorData.error || 'Backend upload failed' },
          { status: backendResponse.status }
        );
      }

      // Return backend response
      const responseData = await backendResponse.json();
      console.log(`[proxy-upload] Upload successful for job ${jobId}`);
      return NextResponse.json(responseData);
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_HEADERS_TIMEOUT') {
        console.error('[proxy-upload] Request timeout - backend took too long to respond');
        console.error('[proxy-upload] This is likely due to Node.js fetch (undici) 30s headers timeout limit');
        console.error('[proxy-upload] Consider: 1) Backend sends 202 Accepted immediately, 2) Direct uploads from frontend, 3) Different HTTP client');
        return NextResponse.json(
          { 
            error: 'Upload timeout: The backend server took longer than 30 seconds to respond. This is a limitation of the proxy. Consider uploading directly to the backend or configuring the backend to respond faster.',
            code: 'TIMEOUT',
            suggestion: 'For large files, consider direct uploads from the frontend. See CORS_CONFIGURATION.md for setup instructions.'
          },
          { status: 504 }
        );
      }
      
      // Handle network errors
      if (fetchError.message?.includes('fetch failed') || fetchError.cause) {
        console.error('[proxy-upload] Network error:', fetchError.cause || fetchError.message);
        return NextResponse.json(
          { 
            error: 'Network error: Could not connect to backend server. Please check your connection and try again.',
            code: 'NETWORK_ERROR',
            details: fetchError.cause?.message || fetchError.message
          },
          { status: 502 }
        );
      }
      
      throw fetchError; // Re-throw other errors
    }
  } catch (error: any) {
    console.error('[proxy-upload] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Upload proxy failed',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
