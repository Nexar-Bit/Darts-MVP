'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Check } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/supabase/database';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          const { profile: userProfile } = await getCurrentUserProfile();
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

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

  return (
    <ProtectedRoute>
      <DashboardLayout
        user={user ? { email: user.email || undefined } : null}
        onSignOut={handleSignOut}
      >
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back{user?.email ? `, ${user.email}` : ''}!
            </p>
          </div>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
              <CardDescription>Your current subscription information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      profile?.is_paid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {profile?.is_paid ? 'Active' : 'Free Plan'}
                  </span>
                </div>
                {profile?.stripe_customer_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Customer ID</span>
                    <span className="text-sm text-gray-600 font-mono">
                      {profile.stripe_customer_id.substring(0, 20)}...
                    </span>
                  </div>
                )}
                {profile?.stripe_subscription_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Subscription ID</span>
                    <span className="text-sm text-gray-600 font-mono">
                      {profile.stripe_subscription_id.substring(0, 20)}...
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href="/dashboard/billing"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Go to Billing →
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href="/dashboard/profile"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Go to Profile →
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          {profile?.is_paid && (
            <Card>
              <CardHeader>
                <CardTitle>Pro Features</CardTitle>
                <CardDescription>Features available with your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    'Unlimited projects',
                    'Priority support',
                    'Advanced analytics',
                    'Custom integrations',
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Upgrade CTA */}
          {!profile?.is_paid && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>Unlock all features with a Pro subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href="/pricing"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  View Pricing Plans
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
