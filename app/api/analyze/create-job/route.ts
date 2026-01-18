import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth, createSupabaseServerClient } from '@/lib/supabase/supabaseServer';
import { incrementAnalysisCount } from '@/lib/supabase/databaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lightweight endpoint to create a job and check permissions
 * Returns job_id for direct upload to backend
 */
export async function POST(request: NextRequest) {
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

    // Step 3: Get user profile and check subscription status
    const supabaseServer = createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Step 4: Check subscription status
    if (!profile.is_paid) {
      return NextResponse.json(
        { 
          error: 'You need to purchase a plan to analyze throws',
          code: 'SUBSCRIPTION_REQUIRED',
          redirect: '/pricing'
        },
        { status: 403 }
      );
    }

    // Check usage limits
    const analysisLimit = profile.analysis_limit || 0;
    const analysisCount = profile.analysis_count || 0;
    const remaining = analysisLimit - analysisCount;

    if (remaining <= 0) {
      return NextResponse.json(
        { 
          error: profile.plan_type === 'starter' 
            ? 'You have used all 3 analyses from your Starter Plan. Please upgrade to Monthly Plan for more analyses.'
            : 'You have reached your monthly analysis limit. Your limit will reset next month.'
        },
        { status: 403 }
      );
    }

    // Get filename from request body (optional)
    const body = await request.json().catch(() => ({}));
    const originalFilename = body.filename || 'unknown';

    // Increment the usage count BEFORE creating job
    const { profile: updatedProfile, error: updateError } = await incrementAnalysisCount(user.id);

    if (updateError) {
      console.error('Error updating analysis usage:', updateError);
      if (updateError.code === 'LIMIT_REACHED') {
        return NextResponse.json(
          { error: updateError.message || 'Analysis limit reached' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to update usage count' },
        { status: 500 }
      );
    }

    // Create job in database
    const createdAtUnix = Math.floor(Date.now() / 1000);
    const { data: job, error: jobError } = await supabaseServer
      .from('jobs')
      .insert({
        user_id: user.id,
        created_at_unix: createdAtUnix,
        original_filename: originalFilename,
        status: 'queued',
        progress: 0,
      })
      .select('job_id')
      .single();

    if (jobError || !job) {
      console.error('Error creating job:', jobError);
      // Rollback analysis count
      await supabaseServer
        .from('profiles')
        .update({
          analysis_count: analysisCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      return NextResponse.json(
        { error: 'Failed to create analysis job' },
        { status: 500 }
      );
    }

    // Return job_id and backend URL for direct upload
    // Prefer AI_BACKEND_URL (server-side) or NEXT_PUBLIC_AI_BACKEND_URL (client-side)
    // Fallback to NEXT_PUBLIC_API_BASE_URL if available
    const aiBackendUrl = process.env.AI_BACKEND_URL || 
                         process.env.NEXT_PUBLIC_AI_BACKEND_URL || 
                         process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // Ensure URL uses HTTPS for production (if not already specified)
    let backendUrl = aiBackendUrl;
    if (backendUrl && !backendUrl.startsWith('http')) {
      backendUrl = `https://${backendUrl}`;
    } else if (backendUrl && backendUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
      // Force HTTPS in production
      backendUrl = backendUrl.replace('http://', 'https://');
    }
    
    return NextResponse.json({
      job_id: job.job_id,
      user_id: user.id,
      backend_url: backendUrl,
      upload_endpoint: backendUrl ? `${backendUrl}/upload` : null,
      analyze_endpoint: backendUrl ? `${backendUrl}/analyze` : null,
    });
  } catch (error) {
    console.error('Error in create-job API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
