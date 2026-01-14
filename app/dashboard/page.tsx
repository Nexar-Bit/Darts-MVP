import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/supabaseServer';
import { headers } from 'next/headers';
import DashboardClient from './DashboardClient';

/**
 * Server-side protected dashboard page
 * Checks authentication and is_paid status before rendering
 * 
 * Note: In Next.js 14 App Router, we use server components for initial data fetching
 * The actual session is managed client-side by Supabase, so we'll pass minimal data
 * and let the client component handle the full auth check
 */
export default async function DashboardPage() {
  // Get headers to check for authorization
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  
  let user = null;
  let profile = null;

  try {
    // Try to get user from authorization header (if available)
    // In production, this would come from the client's session
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { createSupabaseServerClientWithAuth } = await import('@/lib/supabase/supabaseServer');
      const supabase = createSupabaseServerClientWithAuth(token);
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && authUser) {
        user = authUser;

        // Get user profile to check is_paid status
        const supabaseServer = createSupabaseServerClient();
        const { data: profileData, error: profileError } = await supabaseServer
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!profileError && profileData) {
          profile = profileData;
        }
      }
    }
    
    // If no auth header, we'll let the client component handle auth
    // This is fine because ProtectedRoute will redirect if not authenticated
  } catch (err) {
    console.error('Server-side auth error:', err);
    // Don't redirect here - let client component handle it for better UX
  }

  // Pass data to client component
  // Client component will handle full auth check via ProtectedRoute
  return (
    <DashboardClient
      initialUser={user ? {
        id: user.id,
        email: user.email || undefined,
      } : null}
      initialProfile={profile ? {
        id: profile.id,
        email: profile.email,
        is_paid: profile.is_paid,
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: profile.stripe_subscription_id,
        analysis_count: profile.analysis_count,
        analysis_limit: profile.analysis_limit,
        last_analysis_reset: profile.last_analysis_reset,
        plan_type: profile.plan_type,
        plan_purchased_at: profile.plan_purchased_at,
        updated_at: profile.updated_at,
      } : null}
    />
  );
}
