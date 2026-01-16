import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClientWithAuth, createSupabaseServerClient } from '@/lib/supabase/supabaseServer';

/**
 * Middleware for protecting dashboard routes
 * 
 * Server-side enforcement:
 * 1. Checks authentication on every dashboard access
 * 2. Checks is_paid status for protected routes (all except billing/profile/settings)
 * 3. Redirects to /pricing if not paid
 * 4. Redirects to /login if not authenticated
 * 
 * Note: Supabase uses localStorage for sessions, so middleware may not always
 * have access to the token. Client-side ProtectedRoute provides additional protection.
 */
export async function middleware(request: NextRequest) {
  // Only protect dashboard routes
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Exclude certain dashboard routes from is_paid check
  // These routes allow unpaid users to manage their account
  const publicDashboardRoutes = [
    '/dashboard/billing',
    '/dashboard/profile',
    '/dashboard/settings',
  ];
  const isPublicRoute = publicDashboardRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  );

  try {
    // Get access token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    let accessToken = authHeader?.replace('Bearer ', '');
    
    // Try to get from cookies (Supabase may store session in cookies)
    if (!accessToken) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (projectRef) {
        const cookieName = `sb-${projectRef}-auth-token`;
        const authCookie = request.cookies.get(cookieName);
        
        if (authCookie?.value) {
          try {
            const sessionData = JSON.parse(decodeURIComponent(authCookie.value));
            accessToken = sessionData?.access_token || sessionData?.token;
          } catch {
            accessToken = authCookie.value;
          }
        }
      }
      
      // Fallback: try to find any Supabase auth cookie
      if (!accessToken) {
        const allCookies = request.cookies.getAll();
        const authCookie = allCookies.find(cookie => 
          cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
        );
        
        if (authCookie?.value) {
          try {
            const sessionData = JSON.parse(decodeURIComponent(authCookie.value));
            accessToken = sessionData?.access_token || sessionData?.token;
          } catch {
            accessToken = authCookie.value;
          }
        }
      }
    }

    // If no access token found, allow through
    // Supabase stores sessions in localStorage by default, not cookies
    // Client-side ProtectedRoute will handle authentication
    if (!accessToken) {
      return NextResponse.next();
    }

    // Verify user authentication
    const supabase = createSupabaseServerClientWithAuth(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If authentication fails, allow through (client will handle)
    if (authError || !user) {
      return NextResponse.next();
    }

    // For routes that require payment, check is_paid status
    if (!isPublicRoute) {
      // Get user profile to check is_paid status
      const supabaseServer = createSupabaseServerClient();
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('is_paid')
        .eq('id', user.id)
        .single();

      // Server-side enforcement: redirect if not paid
      if (profileError) {
        console.error('Middleware: Error fetching profile:', profileError);
        // If we can't verify payment status, redirect to pricing for safety
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/pricing';
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      } else if (!profile || !profile.is_paid) {
        // User is not paid - redirect to pricing (server-side enforcement)
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/pricing';
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // User is authenticated and (paid or on public route)
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login for safety
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
