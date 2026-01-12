'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CreditCard, ExternalLink, Check } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/supabase/database';

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError('Failed to load billing information');
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

  const handleManageBilling = async () => {
    if (!user) return;

    setPortalLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        setPortalLoading(false);
        return;
      }

      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create portal session');
        setPortalLoading(false);
        return;
      }

      if (data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        setError('No portal URL received');
        setPortalLoading(false);
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      setError('Failed to access billing portal. Please try again.');
      setPortalLoading(false);
    }
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
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
            <p className="text-gray-600 mt-2">
              Manage your subscription and billing information
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Your subscription status and plan details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Plan</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    profile?.is_paid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {profile?.is_paid ? 'Pro' : 'Free'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span className="text-sm text-gray-900 font-medium">
                  {profile?.is_paid ? 'Active' : 'Inactive'}
                </span>
              </div>

              {profile?.stripe_customer_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Customer ID</span>
                  <span className="text-sm text-gray-600 font-mono">
                    {profile.stripe_customer_id.substring(0, 24)}...
                  </span>
                </div>
              )}

              {profile?.stripe_subscription_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Subscription ID</span>
                  <span className="text-sm text-gray-600 font-mono">
                    {profile.stripe_subscription_id.substring(0, 24)}...
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manage Billing */}
          {profile?.is_paid && profile?.stripe_customer_id ? (
            <Card>
              <CardHeader>
                <CardTitle>Manage Subscription</CardTitle>
                <CardDescription>
                  Update your payment method, view invoices, or cancel your subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleManageBilling}
                  isLoading={portalLoading}
                  disabled={portalLoading}
                  className="w-full md:w-auto"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Manage Billing
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  You&apos;ll be redirected to Stripe&apos;s secure customer portal where you can manage
                  your subscription, update payment methods, and view billing history.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>Get access to all premium features</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  You&apos;re currently on the free plan. Upgrade to unlock all features.
                </p>
                <a href="/pricing">
                  <Button variant="primary" size="lg">
                    View Pricing Plans
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          {profile?.is_paid && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
                <CardDescription>How your subscription is billed</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Secure Payment Processing
                      </p>
                      <p className="text-sm text-gray-600">
                        All payments are securely processed through Stripe
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Automatic Billing
                      </p>
                      <p className="text-sm text-gray-600">
                        Your subscription will automatically renew on the billing cycle
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Cancel Anytime
                      </p>
                      <p className="text-sm text-gray-600">
                        You can cancel your subscription at any time from the billing portal
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>Get assistance with billing questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                If you have questions about your billing or need assistance, please contact our
                support team.
              </p>
              <a href="/contact">
                <Button variant="outline">Contact Support</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
