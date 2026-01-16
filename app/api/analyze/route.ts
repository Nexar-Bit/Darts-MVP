import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth, createSupabaseServerClient } from '@/lib/supabase/supabaseServer';
import { incrementAnalysisCount } from '@/lib/supabase/databaseServer';

export const runtime = 'nodejs';

/**
 * API Route: /api/analyze
 * 
 * Server-side protection:
 * 1. Validates user authentication
 * 2. Checks subscription status (is_paid)
 * 3. Validates usage limits
 * 4. Forwards request to backend API with user_id
 * 5. Returns appropriate error responses
 * 
 * This route is protected by middleware and requires:
 * - Valid authentication token
 * - Active paid subscription
 * - Available analysis quota
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

    // Extract token
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

    // Step 4: Check subscription status (server-side enforcement)
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

    // Get video files from form data (support side_video and front_video)
    const formData = await request.formData();
    const sideVideo = formData.get('side_video') as File | null;
    const frontVideo = formData.get('front_video') as File | null;
    const legacyVideo = formData.get('video') as File | null; // Support legacy single video
    const model = formData.get('model') as string | null || 'gpt-5-mini';

    // At least one video is required
    if (!sideVideo && !frontVideo && !legacyVideo) {
      return NextResponse.json(
        { error: 'At least one video file is required (side_video or front_video)' },
        { status: 400 }
      );
    }

    // Validate file types and sizes
    const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const maxSize = 400 * 1024 * 1024; // 400MB (matching darts-frontend)
    const maxDuration = 70; // seconds

    const validateFile = (file: File, name: string) => {
      if (!validTypes.includes(file.type)) {
        throw new Error(`Invalid file type for ${name}. Please upload a video file (MP4, MOV, AVI, or WebM)`);
      }
      if (file.size > maxSize) {
        throw new Error(`${name} file size must be less than ${maxSize / (1024 * 1024)}MB`);
      }
    };

    try {
      if (sideVideo) validateFile(sideVideo, 'side_video');
      if (frontVideo) validateFile(frontVideo, 'front_video');
      if (legacyVideo) validateFile(legacyVideo, 'video');
    } catch (validationError: any) {
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }

    // Determine original filename
    const originalFilename = sideVideo?.name || frontVideo?.name || legacyVideo?.name || 'unknown';

    // Increment the usage count BEFORE processing
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

    const jobId = job.job_id;

    // Get AI backend URL from environment variables
    const aiBackendUrl = process.env.AI_BACKEND_URL || process.env.NEXT_PUBLIC_AI_BACKEND_URL;
    
    if (!aiBackendUrl) {
      console.warn('AI_BACKEND_URL not configured, job created but will need backend to process');
      // Return job_id immediately - backend will process async
      return NextResponse.json({
        job_id: jobId,
      });
    }

    // Proxy to AI backend (async processing)
    // Don't await - let it process in background
    (async () => {
      try {
        const backendFormData = new FormData();
        
        if (sideVideo) {
          const sideBuffer = Buffer.from(await sideVideo.arrayBuffer());
          const sideBlob = new Blob([sideBuffer], { type: sideVideo.type });
          backendFormData.append('side_video', sideBlob, sideVideo.name);
        }
        
        if (frontVideo) {
          const frontBuffer = Buffer.from(await frontVideo.arrayBuffer());
          const frontBlob = new Blob([frontBuffer], { type: frontVideo.type });
          backendFormData.append('front_video', frontBlob, frontVideo.name);
        }
        
        if (legacyVideo && !sideVideo && !frontVideo) {
          const legacyBuffer = Buffer.from(await legacyVideo.arrayBuffer());
          const legacyBlob = new Blob([legacyBuffer], { type: legacyVideo.type });
          backendFormData.append('video', legacyBlob, legacyVideo.name);
        }
        
        // Step 5: Forward request to backend API with user_id
        // Always include user_id for backend tracking and user-specific processing
        backendFormData.append('user_id', user.id);
        backendFormData.append('job_id', jobId);
        backendFormData.append('model', model);
        
        // Include user email for backend logging/notifications (optional)
        if (user.email) {
          backendFormData.append('user_email', user.email);
        }

        // Update job status to running
        await supabaseServer
          .from('jobs')
          .update({
            status: 'running',
            progress: 0.1,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId);

        // Forward request to AI backend with user context
        // Backend flow: First upload videos, then start analysis
        // For now, we'll call /analyze which may handle both upload and analysis
        // If backend requires separate /upload then /analyze, we'll need to update this
        const backendResponse = await fetch(`${aiBackendUrl}/analyze?model=${encodeURIComponent(model)}`, {
          method: 'POST',
          headers: {
            // Include API key if configured
            ...(process.env.AI_BACKEND_API_KEY && {
              'X-API-Key': process.env.AI_BACKEND_API_KEY,
            }),
            // Include user ID in headers for backend tracking
            'X-User-ID': user.id,
            // Include authorization token for backend to verify (if backend supports it)
            ...(token && {
              'Authorization': `Bearer ${token}`,
            }),
          },
          body: backendFormData,
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse.json().catch(() => ({ error: 'Backend error' }));
          console.error('AI backend error:', errorData);
          
          // Update job status to failed
          await supabaseServer
            .from('jobs')
            .update({
              status: 'failed',
              error_message: errorData.error || 'Backend processing failed',
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId);
          
          // Rollback analysis count
          await supabaseServer
            .from('profiles')
            .update({
              analysis_count: analysisCount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
          
          return;
        }

        const backendData = await backendResponse.json();

        // Update job with results
        await supabaseServer
          .from('jobs')
          .update({
            status: 'done',
            progress: 1,
            overlay_url: backendData.overlay_url || null,
            overlay_side_url: backendData.overlay_side_url || null,
            overlay_front_url: backendData.overlay_front_url || null,
            analysis_url: backendData.analysis_url || null,
            practice_plan_url: backendData.practice_plan_url || null,
            practice_plan_txt_url: backendData.practice_plan_txt_url || null,
            practice_plan_pdf_url: backendData.practice_plan_pdf_url || null,
            lesson_plan_url: backendData.lesson_plan_url || null,
            throws_detected: backendData.throws_detected || null,
            result_data: backendData.result || backendData.results || null,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId);

      } catch (backendError: any) {
        console.error('Error proxying to AI backend:', backendError);
        
        // Update job status to failed
        await supabaseServer
          .from('jobs')
          .update({
            status: 'failed',
            error_message: backendError.message || 'Failed to connect to analysis service',
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId);
        
        // Rollback analysis count
        await supabaseServer
          .from('profiles')
          .update({
            analysis_count: analysisCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    })();

    // Return job_id immediately
    return NextResponse.json({
      job_id: jobId,
    });
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
