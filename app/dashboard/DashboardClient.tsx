'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Upload, Video, AlertCircle, CheckCircle, Loader2, FileText, X } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import AnalysisResults, { type AnalysisResult } from '@/components/dashboard/AnalysisResults';
import type { UserProfile } from '@/lib/supabase/database';

interface DashboardClientProps {
  initialUser: {
    id: string;
    email?: string;
  } | null;
  initialProfile: UserProfile | null;
}

export default function DashboardClient({ initialUser, initialProfile }: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for session_id in URL (from Stripe checkout redirect)
    const checkSessionId = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      
      if (sessionId) {
        // Verify the session and update profile
        try {
          const supabase = createSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.access_token) {
            return;
          }

          const response = await fetch('/api/verify-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ sessionId }),
          });

          const data = await response.json();
          
          console.log('Session verification response:', data);
          
          if (data.success && data.updated) {
            toast.success(`Successfully activated ${data.planType === 'starter' ? 'Starter' : 'Monthly'} Plan!`);
            
            // Force refresh profile immediately
            const { profile: updatedProfile } = await getCurrentUserProfile();
            if (updatedProfile) {
              setProfile(updatedProfile);
              console.log('Profile updated after purchase:', updatedProfile);
            } else {
              // If profile fetch fails, try again after a short delay
              setTimeout(async () => {
                const { profile: retryProfile } = await getCurrentUserProfile();
                if (retryProfile) {
                  setProfile(retryProfile);
                }
              }, 1000);
            }
            
            // Remove session_id from URL
            window.history.replaceState({}, '', '/dashboard');
          } else if (data.success && !data.updated) {
            // Session verified but not updated - might be processing or webhook already handled it
            console.log('Session verified but not updated:', data.message);
            
            // Wait a moment for webhook to process, then refresh profile
            setTimeout(async () => {
              const { profile: updatedProfile } = await getCurrentUserProfile();
              if (updatedProfile) {
                setProfile(updatedProfile);
                console.log('Profile refreshed after delay:', updatedProfile);
                // If profile shows as paid now, show success message
                if (updatedProfile.is_paid) {
                  toast.success(`Successfully activated ${updatedProfile.plan_type === 'starter' ? 'Starter' : 'Monthly'} Plan!`);
                } else {
                  // If still not paid, try one more time after another delay
                  setTimeout(async () => {
                    const { profile: finalProfile } = await getCurrentUserProfile();
                    if (finalProfile) {
                      setProfile(finalProfile);
                      if (finalProfile.is_paid) {
                        toast.success(`Plan activated!`);
                      }
                    }
                  }, 3000);
                }
              }
            }, 2000);
            
            // Remove session_id from URL
            window.history.replaceState({}, '', '/dashboard');
          } else if (data.error) {
            console.error('Session verification error:', data.error);
            toast.error(`Failed to verify payment: ${data.error}`);
            // Still try to refresh profile in case webhook processed it
            setTimeout(async () => {
              const { profile: updatedProfile } = await getCurrentUserProfile();
              if (updatedProfile && updatedProfile.is_paid) {
                setProfile(updatedProfile);
                toast.success(`Plan activated!`);
              }
            }, 2000);
          }
        } catch (err) {
          console.error('Error verifying session:', err);
        }
      }
    };

    // Refresh profile data
    const refreshProfile = async () => {
      try {
        const { profile: updatedProfile } = await getCurrentUserProfile();
        if (updatedProfile) {
          setProfile(updatedProfile);
          console.log('Profile loaded:', updatedProfile);
        }
      } catch (err) {
        console.error('Error refreshing profile:', err);
      }
    };

    checkSessionId();
    refreshProfile();
    
    // Also refresh profile periodically if there's a session_id in URL (in case of delays)
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      // Refresh profile every 2 seconds for up to 10 seconds after returning from checkout
      let attempts = 0;
      const refreshInterval = setInterval(async () => {
        attempts++;
        const { profile: updatedProfile } = await getCurrentUserProfile();
        if (updatedProfile) {
          setProfile(updatedProfile);
          if (updatedProfile.is_paid || attempts >= 5) {
            clearInterval(refreshInterval);
          }
        }
      }, 2000);
      
      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(refreshInterval), 10000);
    }
  }, [toast]);

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login', { scroll: false });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid video file (MP4, MOV, AVI, or WebM)');
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File size must be less than 100MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
      toast.success('Video file selected');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a video file first');
      return;
    }

    if (!profile?.is_paid) {
      toast.error('You need to purchase a plan to analyze throws');
      router.push('/pricing', { scroll: false });
      return;
    }

    // Check usage limits
    const remaining = (profile.analysis_limit || 0) - (profile.analysis_count || 0);
    if (remaining <= 0) {
      toast.error('You have reached your analysis limit');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    toast.info('Uploading and analyzing video...');

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('userId', initialUser?.id || '');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      // Handle streaming response if backend supports it
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle text response
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Invalid response from server');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze video');
      }

      // Handle different response formats
      const result: AnalysisResult = {
        id: data.analysisId || data.id || `analysis_${Date.now()}`,
        status: data.status || 'completed',
        timestamp: data.results?.timestamp || data.timestamp || new Date().toISOString(),
        insights: data.results?.insights || data.insights || [],
        recommendations: data.results?.recommendations || data.recommendations || [],
        metrics: data.results?.metrics || data.metrics,
        videoUrl: data.results?.videoUrl || data.videoUrl,
        reportUrl: data.results?.reportUrl || data.reportUrl,
      };

      setAnalysisResult(result);
      setUploadProgress(100);
      toast.success('Analysis completed successfully!');
      
      // Refresh profile to update analysis count
      const { profile: updatedProfile } = await getCurrentUserProfile();
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      const errorMessage = err.message || 'Failed to analyze video. Please try again.';
      setError(errorMessage);
      setUploadProgress(0);
      
      // Set failed status if we have a result object
      if (analysisResult) {
        setAnalysisResult({
          ...analysisResult,
          status: 'failed',
        });
      }
      
      toast.error(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setUploadProgress(0);
  };

  const handleNewAnalysis = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setUploadProgress(0);
  };

  const remaining = profile?.analysis_limit && profile.analysis_count !== undefined
    ? profile.analysis_limit - profile.analysis_count
    : 0;

  return (
    <ProtectedRoute>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <DashboardLayout
        user={initialUser ? { email: initialUser.email } : null}
        onSignOut={handleSignOut}
      >
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back{initialUser?.email ? `, ${initialUser.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-blue-100 text-lg">
              {profile?.is_paid 
                ? profile?.plan_type === 'monthly'
                  ? "You're on the Monthly Plan with 12 analyses per month. Let's get started!"
                  : "You're on the Starter Plan with 3 analyses. Let's get started!"
                : "Ready to start analyzing your throws? Choose a plan to get started."}
            </p>
          </div>

          {/* Membership Status */}
          {profile?.is_paid ? (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {profile.plan_type === 'monthly' ? 'Monthly Plan' : 'Starter Plan'} - Active
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {profile.plan_type === 'monthly' 
                          ? '12 analyses per month • Billed monthly'
                          : '3 analyses total • One-time payment'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Usage Status */}
          {profile?.is_paid && (
            <Card className={remaining > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Analyses Remaining
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {remaining > 0
                        ? `You have ${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} remaining`
                        : 'You have reached your analysis limit'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">
                      {remaining} / {profile.analysis_limit || 0}
                    </div>
                    {profile.plan_type === 'monthly' && (
                      <p className="text-xs text-gray-500 mt-1">Resets monthly</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Upload & Analysis Section */}
          {profile?.is_paid ? (
            <Card>
              <CardHeader>
                <CardTitle>Analyze Your Throw</CardTitle>
                <CardDescription>
                  Upload a video file of your throw for AI analysis (MP4, MOV, AVI, or WebM, max 100MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Input */}
                <div>
                  <label htmlFor="video-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Video File
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      disabled={analyzing}
                      className="cursor-pointer"
                    />
                    {selectedFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={analyzing}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <Video className="h-4 w-4" />
                      <span>{selectedFile.name}</span>
                      <span className="text-gray-400">
                        ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {analyzing && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Analyze Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleAnalyze}
                  disabled={!selectedFile || analyzing || remaining <= 0}
                  isLoading={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Analyze Throw
                    </>
                  )}
                </Button>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Error</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Display */}
                {analysisResult && (
                  <AnalysisResults 
                    result={analysisResult} 
                    onNewAnalysis={handleNewAnalysis}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Purchase a Plan to Get Started
                    </h3>
                    <p className="text-gray-700 mb-4">
                      You need to purchase a plan to analyze your throws. Choose between our Starter Plan (3 analyses) or Monthly Plan (12 analyses per month).
                    </p>
                    <Link href="/pricing">
                      <Button variant="primary">View Pricing Plans</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <Link href="/dashboard/profile">
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Settings</CardTitle>
                    <CardDescription>Update your account information</CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <Link href="/dashboard/billing">
                  <CardHeader>
                    <CardTitle className="text-lg">Billing & Subscription</CardTitle>
                    <CardDescription>Manage your subscription</CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              {profile?.is_paid && (
                <Card className="hover:shadow-lg transition-shadow">
                  <Link href="/dashboard/analyze">
                    <CardHeader>
                      <CardTitle className="text-lg">Full Analysis</CardTitle>
                      <CardDescription>Upload and analyze throws</CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
