import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth, createSupabaseServerClient } from '@/lib/supabase/supabaseServer';
import { incrementAnalysisCount } from '@/lib/supabase/databaseServer';

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get token from Bearer token
    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseServerClientWithAuth(token);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check limits
    const supabaseServer = createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user has a paid plan
    if (!profile.is_paid) {
      return NextResponse.json(
        { error: 'You need to purchase a plan to analyze throws' },
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

    // Get the video file from form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!validTypes.includes(videoFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file (MP4, MOV, AVI, or WebM)' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 100MB' },
        { status: 400 }
      );
    }

    // TODO: Here you would:
    // 1. Upload the video to storage (Supabase Storage, S3, etc.)
    // 2. Process the video with your AI analysis service
    // 3. Store the analysis results in the database
    // 4. Return the analysis results

    // Increment the usage count (this also checks limits)
    const { profile: updatedProfile, error: updateError } = await incrementAnalysisCount(user.id);

    if (updateError) {
      console.error('Error updating analysis usage:', updateError);
      // If limit reached, return specific error
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

    const newRemaining = updatedProfile 
      ? (updatedProfile.analysis_limit || 0) - (updatedProfile.analysis_count || 0)
      : remaining - 1;

    // Simulate processing (remove this in production)
    // In production, you would:
    // - Upload to storage
    // - Queue for processing
    // - Return a job ID or analysis ID
    const analysisId = `analysis_${Date.now()}_${user.id}`;

    return NextResponse.json({
      success: true,
      message: 'Analysis submitted successfully',
      analysisId,
      remaining: newRemaining,
      // In production, you might return:
      // - analysisId: for tracking
      // - status: 'processing' | 'completed'
      // - resultsUrl: URL to view results
    });
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
