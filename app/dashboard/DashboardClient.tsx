'use client';

import { useState, useEffect, useRef } from 'react';
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
  const verificationAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    // Check for session_id in URL (from Stripe checkout redirect)
    const checkSessionId = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      
      // Only verify once per session_id - use ref to persist across renders
      if (sessionId && verificationAttemptedRef.current !== sessionId) {
        verificationAttemptedRef.current = sessionId;
        
        // Remove session_id from URL IMMEDIATELY to prevent re-triggering
        window.history.replaceState({}, '', '/dashboard');
        
        // Verify the session and update profile
        try {
          const supabase = createSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.access_token) {
            console.warn('No session token available for verification');
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
            
            // Use profile from response if available, otherwise fetch it
            if (data.profile) {
              setProfile(data.profile);
              console.log('Profile updated from response:', data.profile);
              // Force a re-render by updating state
              if (!data.profile.is_paid) {
                console.warn('Profile from response shows is_paid=false, but update was successful. Retrying...');
                setTimeout(async () => {
                  const { profile: retryProfile } = await getCurrentUserProfile();
                  if (retryProfile) {
                    setProfile(retryProfile);
                    console.log('Profile retry after delay:', retryProfile);
                  }
                }, 1000);
              }
            } else {
              // Fallback: refresh profile immediately and retry if needed
              try {
                // First immediate refresh
                const { profile: updatedProfile } = await getCurrentUserProfile();
                if (updatedProfile) {
                  setProfile(updatedProfile);
                  console.log('Profile updated after purchase:', updatedProfile);
                  
                  // If still not showing as paid, wait a moment and try again (webhook might be processing)
                  if (!updatedProfile.is_paid) {
                    setTimeout(async () => {
                      const { profile: retryProfile } = await getCurrentUserProfile();
                      if (retryProfile) {
                        setProfile(retryProfile);
                        console.log('Profile retry after delay:', retryProfile);
                        // One more retry if still not paid
                        if (!retryProfile.is_paid) {
                          setTimeout(async () => {
                            const { profile: finalProfile } = await getCurrentUserProfile();
                            if (finalProfile) {
                              setProfile(finalProfile);
                              console.log('Final profile retry:', finalProfile);
                            }
                          }, 3000);
                        }
                      }
                    }, 2000);
                  }
                }
              } catch (err) {
                console.error('Error refreshing profile:', err);
              }
            }
          } else if (data.success && !data.updated) {
            // Session verified but not updated - might be processing or webhook already handled it
            console.log('Session verified but not updated:', data.message);
            
            // Try to refresh profile once after a delay
            setTimeout(async () => {
              try {
                const { profile: updatedProfile } = await getCurrentUserProfile();
                if (updatedProfile) {
                  setProfile(updatedProfile);
                  if (updatedProfile.is_paid) {
                    toast.success(`Successfully activated ${updatedProfile.plan_type === 'starter' ? 'Starter' : 'Monthly'} Plan!`);
                  }
                }
              } catch (err) {
                console.error('Error refreshing profile:', err);
              }
            }, 2000);
          } else if (data.error) {
            console.error('Session verification error:', data.error);
            
            // Check if migration is required
            if (data.migrationRequired || data.error.includes('migration') || data.error.includes('PGRST204')) {
              // Migration needed - show helpful message
              toast.error(
                `Database migration required. Your payment was processed, but please run the migration in Supabase to activate all features.`,
                10000
              );
              
              // Still try to refresh profile in case basic update succeeded
              setTimeout(async () => {
                try {
                  const { profile: updatedProfile } = await getCurrentUserProfile();
                  if (updatedProfile) {
                    setProfile(updatedProfile);
                    if (updatedProfile.is_paid) {
                      toast.success(`Plan activated! (Run migration for full features)`);
                    }
                  }
                } catch (err) {
                  console.error('Error refreshing profile:', err);
                }
              }, 2000);
            } else if (data.warning) {
              // Migration needed but basic update succeeded
              toast.success(`Plan activated! (Some features require database migration)`);
              // Still try to refresh profile
              setTimeout(async () => {
                try {
                  const { profile: updatedProfile } = await getCurrentUserProfile();
                  if (updatedProfile) {
                    setProfile(updatedProfile);
                  }
                } catch (err) {
                  console.error('Error refreshing profile:', err);
                }
              }, 1000);
            } else {
              // Other error - but payment might have succeeded, so check profile anyway
              console.warn('Verification failed, but checking profile in case payment succeeded:', data.error);
              
              // Try to refresh profile multiple times in case webhook processed it
              const checkProfile = async (attempt = 1) => {
                try {
                  const { profile: updatedProfile } = await getCurrentUserProfile();
                  if (updatedProfile) {
                    setProfile(updatedProfile);
                    if (updatedProfile.is_paid) {
                      toast.success(`Plan activated!`);
                      return; // Success, stop retrying
                    }
                  }
                  
                  // Retry up to 3 times
                  if (attempt < 3) {
                    setTimeout(() => checkProfile(attempt + 1), 2000);
                  } else {
                    // Final attempt failed - show error
                    toast.error(`Payment verification failed. If payment succeeded, please refresh the page.`);
                  }
                } catch (err) {
                  console.error('Error refreshing profile:', err);
                  if (attempt < 3) {
                    setTimeout(() => checkProfile(attempt + 1), 2000);
                  }
                }
              };
              
              // Start checking profile
              setTimeout(() => checkProfile(), 2000);
            }
          }
        } catch (err) {
          console.error('Error verifying session:', err);
          toast.error('Failed to verify payment. Please refresh the page.');
        }
      }
    };

    // Refresh profile data function
    const refreshProfile = async () => {
      try {
        const { profile: updatedProfile, error } = await getCurrentUserProfile();
        if (updatedProfile) {
          setProfile(updatedProfile);
          console.log('Profile loaded:', updatedProfile);
        } else if (error) {
          // Log error but don't retry - might be RLS or migration issue
          console.warn('Profile load error (non-critical):', error);
        }
      } catch (err) {
        // Don't log errors that might cause re-renders
        console.warn('Error refreshing profile:', err);
      }
    };

    // Check if we're returning from Stripe checkout
    const params = new URLSearchParams(window.location.search);
    const hasSessionId = params.get('session_id');
    
    if (hasSessionId) {
      // Verify session and refresh profile
      checkSessionId();
    } else {
      // Normal page load - just refresh profile
      refreshProfile();
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
            <div className="flex items-start justify-between">
              <div className="flex-1">
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
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { profile: updatedProfile } = await getCurrentUserProfile();
                  if (updatedProfile) {
                    setProfile(updatedProfile);
                    toast.success('Profile refreshed!');
                  }
                }}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 ml-4"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Membership Status - Show when user has a paid plan */}
          {profile?.is_paid && profile?.plan_type ? (
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
