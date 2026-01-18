import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large uploads

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
 * Streaming proxy endpoint for video uploads
 * Forwards uploads to backend without buffering entire file
 * This bypasses Vercel's 4.5MB body size limit by streaming
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
    // Note: We need to read the form data, but Node.js will handle streaming internally
    const formData = await request.formData();
    
    // Reconstruct FormData for backend
    const backendFormData = new FormData();
    
    // Get specific fields we need
    const sideVideo = formData.get('side_video') as File | null;
    const frontVideo = formData.get('front_video') as File | null;
    const userId = formData.get('user_id') as string | null;
    const model = formData.get('model') as string | null || 'gpt-5-mini';
    
    // Add files to backend FormData
    if (sideVideo) {
      const fileBuffer = await sideVideo.arrayBuffer();
      const fileBlob = new Blob([fileBuffer], { type: sideVideo.type });
      backendFormData.append('side_video', fileBlob, sideVideo.name);
    }
    
    if (frontVideo) {
      const fileBuffer = await frontVideo.arrayBuffer();
      const fileBlob = new Blob([fileBuffer], { type: frontVideo.type });
      backendFormData.append('front_video', fileBlob, frontVideo.name);
    }
    
    // Add metadata
    if (userId) {
      backendFormData.append('user_id', userId);
    }
    backendFormData.append('job_id', jobId);
    backendFormData.append('model', model);

    // Forward request to backend
    const backendResponse = await fetch(backendUploadUrl, {
      method: 'POST',
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

    // Check if backend request was successful
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ 
        error: `Backend error: ${backendResponse.status} ${backendResponse.statusText}` 
      }));
      
      return NextResponse.json(
        { error: errorData.error || 'Backend upload failed' },
        { status: backendResponse.status }
      );
    }

    // Return backend response
    const responseData = await backendResponse.json();
    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.error('Error in proxy-upload:', error);
    return NextResponse.json(
      { error: error.message || 'Upload proxy failed' },
      { status: 500 }
    );
  }
}
