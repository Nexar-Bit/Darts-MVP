'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/supabase/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requirePaid?: boolean; // If true, redirects unpaid users to pricing
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  requirePaid = false,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseClient();

  // Routes that don't require payment even if requirePaid is true
  const publicDashboardRoutes = ['/dashboard/billing', '/dashboard/profile', '/dashboard/settings'];
  const isPublicRoute = publicDashboardRoutes.some(route => pathname === route || pathname.startsWith(route));
  const shouldCheckPayment = requirePaid && !isPublicRoute;

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push(redirectTo);
          return;
        }

        setUser(session.user);

        // If payment check is required, fetch profile
        if (shouldCheckPayment) {
          const { profile: userProfile, error: profileError } = await getCurrentUserProfile();
          
          if (profileError || !userProfile) {
            console.error('Error fetching profile:', profileError);
            // If we can't fetch profile, allow through but log error
            // The server-side middleware will catch it
            setProfile(null);
          } else {
            setProfile(userProfile);
            
            // Check if user is paid
            if (!userProfile.is_paid) {
              // Redirect to pricing with return URL
              const pricingUrl = `/pricing?redirect=${encodeURIComponent(pathname)}`;
              router.push(pricingUrl);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push(redirectTo);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        router.push(redirectTo);
      } else {
        setUser(session.user);
        
        // Re-check payment status if required
        if (shouldCheckPayment) {
          const { profile: userProfile } = await getCurrentUserProfile();
          setProfile(userProfile);
          
          if (userProfile && !userProfile.is_paid) {
            const pricingUrl = `/pricing?redirect=${encodeURIComponent(pathname)}`;
            router.push(pricingUrl);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, redirectTo, supabase, shouldCheckPayment, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If payment is required and user is not paid, don't render (redirect is happening)
  if (shouldCheckPayment && profile && !profile.is_paid) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
