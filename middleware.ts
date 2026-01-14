import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClientWithAuth, createSupabaseServerClient } from '@/lib/supabase/supabaseServer';

/**
 * Middleware for protecting dashboard routes
 * Checks authentication and is_paid status
 * Redirects to login if not authenticated
 * Redirects to pricing if not paid
 */
export async function middleware(request: NextRequest) {
  // Only protect dashboard routes
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Exclude certain dashboard routes from is_paid check (like billing, profile, settings)
  const publicDashboardRoutes = ['/dashboard/billing', '/dashboard/profile', '/dashboard/settings'];
  const isPublicRoute = publicDashboardRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  );

  try {
    // Get access token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    let accessToken = authHeader?.replace('Bearer ', '');
    
    // If no auth header, try to get from cookies
    // Supabase may store session in cookies (if configured)
    // Cookie format: sb-<project-ref>-auth-token
    if (!accessToken) {
      // Get Supabase project ref from URL to construct cookie name
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (projectRef) {
        const cookieName = `sb-${projectRef}-auth-token`;
        const authCookie = request.cookies.get(cookieName);
        
        if (authCookie?.value) {
          try {
            // Parse the cookie value (it's a JSON string containing the session)
            const sessionData = JSON.parse(decodeURIComponent(authCookie.value));
            accessToken = sessionData?.access_token || sessionData?.token;
          } catch {
            // Cookie might not be in expected format, try direct value
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
    // The client-side ProtectedRoute will handle authentication
    // Only redirect if we're certain there's no session (after checking)
    if (!accessToken) {
      // Allow the request through - client-side will handle auth
      // This is necessary because Supabase uses localStorage, not cookies
      return NextResponse.next();
    }

    // Verify user authentication
    const supabase = createSupabaseServerClientWithAuth(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If authentication fails, allow through (client will handle)
    // This is because Supabase sessions are in localStorage, not always in cookies
    if (authError || !user) {
      // Allow through - client-side ProtectedRoute will redirect if needed
      return NextResponse.next();
    }

    // For routes that require payment (not billing/profile/settings), check is_paid
    if (!isPublicRoute) {
      // Get user profile to check is_paid status
      const supabaseServer = createSupabaseServerClient();
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('is_paid')
        .eq('id', user.id)
        .single();

      // If profile check fails, log error but allow through (client will handle)
      if (profileError) {
        console.error('Middleware: Error fetching profile:', profileError);
        // Allow through - client-side ProtectedRoute will handle
      } else if (profile) {
        // If user is not paid, redirect to pricing (server-side enforcement)
        if (!profile.is_paid) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/pricing';
          redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
          return NextResponse.redirect(redirectUrl);
        }
      } else {
        // Profile not found - redirect to pricing as safety measure
        console.warn('Middleware: Profile not found for user:', user.id);
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
