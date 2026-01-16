import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
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

    const jobId = params.jobId;

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json({
          job_id: jobId,
          status: 'not_found',
        });
      }
      console.error('Error fetching job:', jobError);
      return NextResponse.json(
        { error: 'Failed to fetch job' },
        { status: 500 }
      );
    }

    if (!job) {
      return NextResponse.json({
        job_id: jobId,
        status: 'not_found',
      });
    }

    // Format response
    const response: any = {
      job_id: job.job_id,
      status: job.status,
    };

    if (job.progress !== null && job.progress !== undefined) {
      response.progress = Number(job.progress);
    }

    if (job.stage) {
      response.stage = job.stage;
    }

    if (job.error_message) {
      response.error = { message: job.error_message };
    }

    if (job.status === 'done' && job.result_data) {
      response.result = job.result_data;
      
      // Add URL fields if they exist
      if (job.overlay_url) response.result.overlay_url = job.overlay_url;
      if (job.overlay_side_url) response.result.overlay_side_url = job.overlay_side_url;
      if (job.overlay_front_url) response.result.overlay_front_url = job.overlay_front_url;
      if (job.analysis_url) response.result.analysis_url = job.analysis_url;
      if (job.practice_plan_url) response.result.practice_plan_url = job.practice_plan_url;
      if (job.practice_plan_txt_url) response.result.practice_plan_txt_url = job.practice_plan_txt_url;
      if (job.practice_plan_pdf_url) response.result.practice_plan_pdf_url = job.practice_plan_pdf_url;
      if (job.lesson_plan_url) response.result.lesson_plan_url = job.lesson_plan_url;
      if (job.throws_detected !== null) response.result.throws_detected = job.throws_detected;
      
      // If lesson_plan is a URL, fetch it (or it might be in result_data)
      if (job.lesson_plan_url && !response.result.lesson_plan) {
        // Backend should return lesson_plan as embedded object, but if it's a URL, we note it
        response.result.lesson_plan_url = job.lesson_plan_url;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in job status API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
