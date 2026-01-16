import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClientWithAuth(token);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Get limit from query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    // Get jobs for user
    console.log(`Fetching jobs for user: ${user.id}, limit: ${limit}`);
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at_unix', { ascending: false })
      .limit(limit);

    if (jobsError) {
      console.error('Error fetching jobs:', {
        message: jobsError.message,
        code: jobsError.code,
        details: jobsError.details,
        hint: jobsError.hint,
        userId: user.id,
      });
      
      // Check if table doesn't exist
      if (jobsError.code === '42P01' || jobsError.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database table not found',
            details: 'The jobs table does not exist. Please run the database migration.',
            code: jobsError.code,
            hint: 'Run: supabase/migrations/20250120000003_create_jobs_table.sql',
          },
          { status: 500 }
        );
      }
      
      // Check if RLS policy issue
      if (jobsError.code === '42501' || jobsError.message?.includes('permission denied')) {
        return NextResponse.json(
          { 
            error: 'Permission denied',
            details: 'Row Level Security policy is blocking access. Please check RLS policies.',
            code: jobsError.code,
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch jobs',
          details: jobsError.message,
          code: jobsError.code,
          hint: jobsError.hint,
        },
        { status: 500 }
      );
    }
    
    console.log(`Successfully fetched ${jobs?.length || 0} jobs for user ${user.id}`);

    return NextResponse.json({
      user_id: user.id,
      count: jobs?.length || 0,
      jobs: jobs || [],
    });
  } catch (error: any) {
    console.error('Error in jobs API:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
