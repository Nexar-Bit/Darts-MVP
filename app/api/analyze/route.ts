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

    // Increment the usage count BEFORE processing (this also checks limits)
    // This prevents users from submitting multiple requests if they're at their limit
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

    // Get AI backend URL from environment variables
    const aiBackendUrl = process.env.AI_BACKEND_URL || process.env.NEXT_PUBLIC_AI_BACKEND_URL;
    
    if (!aiBackendUrl) {
      console.warn('AI_BACKEND_URL not configured, using mock response');
      // Return mock response if backend is not configured
      const analysisId = `analysis_${Date.now()}_${user.id}`;
      return NextResponse.json({
        success: true,
        message: 'Analysis submitted successfully',
        analysisId,
        remaining: newRemaining,
        status: 'completed',
        results: {
          id: analysisId,
          timestamp: new Date().toISOString(),
          insights: [
            'Release angle: 45° (optimal)',
            'Follow-through: Good extension',
            'Wrist position: Slight adjustment needed',
            'Stance: Balanced and stable',
          ],
          recommendations: [
            'Focus on maintaining consistent release angle',
            'Work on wrist snap timing',
            'Continue practicing follow-through',
          ],
          metrics: {
            releaseAngle: 45,
            followThroughScore: 8.5,
            stanceScore: 9.0,
            overallScore: 8.7,
          },
        },
      });
    }

    // Proxy to AI backend
    try {
      // Create FormData for backend
      // Convert File to buffer for transmission
      const arrayBuffer = await videoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Create FormData for backend
      // Use native FormData (available in Node.js 18+)
      // Create a File-like object from buffer
      const backendFormData = new FormData();
      
      // Append file as Blob (FormData accepts Blob in Node.js 18+)
      const blob = new Blob([buffer], { type: videoFile.type });
      backendFormData.append('video', blob, videoFile.name);
      backendFormData.append('userId', user.id);
      backendFormData.append('userEmail', user.email || '');

      // Forward request to AI backend
      const backendResponse = await fetch(`${aiBackendUrl}/analyze`, {
        method: 'POST',
        headers: {
          // Forward authorization if backend requires it
          ...(process.env.AI_BACKEND_API_KEY && {
            'X-API-Key': process.env.AI_BACKEND_API_KEY,
          }),
        },
        body: backendFormData,
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({ error: 'Backend error' }));
        console.error('AI backend error:', errorData);
        
        // Rollback the analysis count increment on backend error
        // Note: In production, you might want to use a transaction or queue system
        const supabaseServer = createSupabaseServerClient();
        await supabaseServer
          .from('profiles')
          .update({
            analysis_count: analysisCount, // Revert to previous count
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        return NextResponse.json(
          { error: errorData.error || 'Failed to process video. Please try again.' },
          { status: backendResponse.status || 500 }
        );
      }

      const backendData = await backendResponse.json();

      // Store analysis results in database (optional)
      // You might want to create an 'analyses' table to store results
      // For now, we'll just return the results

      return NextResponse.json({
        success: true,
        message: 'Analysis completed successfully',
        analysisId: backendData.analysisId || `analysis_${Date.now()}_${user.id}`,
        remaining: newRemaining,
        status: backendData.status || 'completed',
        results: backendData.results || backendData,
      });
    } catch (backendError: any) {
      console.error('Error proxying to AI backend:', backendError);
      
      // Rollback the analysis count increment on error
      const supabaseServer = createSupabaseServerClient();
      await supabaseServer
        .from('profiles')
        .update({
          analysis_count: analysisCount, // Revert to previous count
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      return NextResponse.json(
        { error: 'Failed to connect to analysis service. Please try again later.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
