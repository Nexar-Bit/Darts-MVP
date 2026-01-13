'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Check, ArrowRight, Zap, Target, BarChart3, Upload, Settings, CreditCard } from 'lucide-react';
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-blue-100 text-lg">
              {profile?.is_paid 
                ? profile?.plan_type === 'monthly'
                  ? "You're on the Monthly Plan with 12 analyses per month. Let's get started!"
                  : "You're on the Starter Plan with 3 analyses. Let's get started!"
                : "Ready to start analyzing your throws? Choose a plan to get started."}
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
                  <span className="text-sm font-medium text-gray-700">Plan</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      profile?.is_paid
                        ? profile?.plan_type === 'monthly'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {profile?.plan_type === 'monthly'
                      ? 'Monthly Plan'
                      : profile?.plan_type === 'starter'
                      ? 'Starter Plan'
                      : 'No Plan'}
                  </span>
                </div>
                {profile?.plan_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Analyses Remaining</span>
                    <span className="text-sm text-gray-900 font-medium">
                      {profile.analysis_limit && profile.analysis_count !== undefined
                        ? `${profile.analysis_limit - profile.analysis_count} / ${profile.analysis_limit}`
                        : 'N/A'}
                    </span>
                  </div>
                )}
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <Link href="/dashboard/profile">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <Settings className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Profile</CardTitle>
                          <CardDescription>Update your information</CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <Link href="/dashboard/billing">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                          <CreditCard className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Billing</CardTitle>
                          <CardDescription>Manage subscription</CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                    </div>
                  </CardHeader>
                </Link>
              </Card>

              {profile?.is_paid && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <Link href="/dashboard">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                            <Upload className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Get Started</CardTitle>
                            <CardDescription>Upload and analyze</CardDescription>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                    </CardHeader>
                  </Link>
                </Card>
              )}
            </div>
          </div>

          {/* Features */}
          {profile?.is_paid ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Pro Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="h-6 w-6 text-blue-600" />
                      <CardTitle className="text-lg">Instant Analysis</CardTitle>
                    </div>
                    <CardDescription>Get real-time feedback and insights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        <span>Advanced processing</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        <span>Detailed reports</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="h-6 w-6 text-green-600" />
                      <CardTitle className="text-lg">Personalized Plans</CardTitle>
                    </div>
                    <CardDescription>Customized recommendations for you</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        <span>Tailored guidance</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        <span>Goal tracking</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                      <CardTitle className="text-lg">Progress Tracking</CardTitle>
                    </div>
                    <CardDescription>Monitor your improvement over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        <span>Performance metrics</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        <span>Historical data</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* Upgrade CTA */}
          {!profile?.is_paid && (
            <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">Unlock Pro Features</CardTitle>
                    <CardDescription className="text-base">
                      Get instant analysis, personalized plans, and progress tracking
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {[
                      { icon: Zap, text: 'Instant Analysis' },
                      { icon: Target, text: 'Personalized Plans' },
                      { icon: BarChart3, text: 'Progress Tracking' },
                    ].map((feature, index) => {
                      const IconComponent = feature.icon;
                      return (
                        <div key={index} className="flex items-center gap-2 text-gray-700">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium">{feature.text}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Link href="/pricing">
                    <Button variant="primary" size="lg" className="w-full sm:w-auto">
                      View Pricing Plans
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
