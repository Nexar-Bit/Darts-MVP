import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe/customerPortal';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/supabaseServer';

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

    // Get user profile to get Stripe customer ID
    const supabaseServer = createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer ID found. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/dashboard/billing`;

    // Create portal session
    const { url, error } = await createPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl,
    });

    if (error || !url) {
      return NextResponse.json(
        { error: error || 'Failed to create portal session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url,
    });
  } catch (error) {
    console.error('Error in create-portal-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
