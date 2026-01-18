'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, Video, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import UploadCard, { validateUploadFile } from '@/components/dashboard/UploadCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import EmptyState from '@/components/dashboard/EmptyState';
import PracticePlanView from '@/components/dashboard/PracticePlanView';
import OverlayPanel from '@/components/dashboard/OverlayPanel';
import ProgressIndicator from '@/components/dashboard/ProgressIndicator';
import { useAnalysis } from '@/lib/hooks';
import { absUrl } from '@/lib/api';
import type { UserProfile } from '@/lib/supabase/database';

interface DashboardClientProps {
  initialUser: {
    id: string;
    email?: string;
  } | null;
  initialProfile: UserProfile | null;
}

function fmtDate(unixSeconds: number) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString();
}

export default function DashboardClient({ initialUser, initialProfile }: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const verificationAttemptedRef = useRef<string | null>(null);

  // Use the analysis hook for state management
  const {
    state,
    progressMessage,
    result,
    history,
    uploadVideos,
    refreshHistory,
    isUploading,
    isAnalyzing,
    isCompleted,
    hasError,
    clearError,
  } = useAnalysis();

  useEffect(() => {
    let isMounted = true;
    
    // Check for session_id in URL (from Stripe checkout redirect)
    const checkSessionId = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      
      if (sessionId && verificationAttemptedRef.current !== sessionId) {
        verificationAttemptedRef.current = sessionId;
        window.history.replaceState({}, '', '/dashboard');
        
        try {
          const supabase = createSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.access_token || !isMounted) return;

          const response = await fetch('/api/verify-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ sessionId }),
          });

          if (!isMounted) return;

          const data = await response.json();
          
          if (data.success && data.updated && isMounted) {
            toast.success(`Successfully activated ${data.planType === 'starter' ? 'Starter' : 'Monthly'} Plan!`);
            if (data.profile) {
              setProfile(data.profile);
            } else {
              const { profile: updatedProfile } = await getCurrentUserProfile();
              if (updatedProfile && isMounted) setProfile(updatedProfile);
            }
          }
        } catch (err: any) {
          // Ignore AbortError - it's expected when component unmounts
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            return;
          }
          if (isMounted) {
            console.error('Error verifying session:', err);
            toast.error('Failed to verify payment. Please refresh the page.');
          }
        }
      }
    };

    const refreshProfile = async () => {
      try {
        const { profile: updatedProfile } = await getCurrentUserProfile();
        if (updatedProfile && isMounted) {
          setProfile(updatedProfile);
        }
      } catch (err: any) {
        // Ignore AbortError - it's expected when component unmounts or React Strict Mode
        if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
          if (isMounted) {
            console.warn('Error refreshing profile:', err);
          }
        }
      }
    };

    const params = new URLSearchParams(window.location.search);
    const hasSessionId = params.get('session_id');
    
    if (hasSessionId) {
      checkSessionId();
    } else {
      refreshProfile();
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleSignOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login', { scroll: false });
  }, [router]);

  const handleUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.is_paid) {
      toast.error('You need to purchase a plan to analyze throws');
      router.push('/pricing');
      return;
    }

    const remaining = (profile.analysis_limit || 0) - (profile.analysis_count || 0);
    if (remaining <= 0) {
      toast.error('You have reached your analysis limit');
      return;
    }

    if (!sideFile && !frontFile) {
      toast.error('Upload at least one video: side-on and/or front-on.');
      return;
    }

    try {
      await uploadVideos(sideFile, frontFile);
      setSideFile(null);
      setFrontFile(null);
      
      // Refresh profile to update analysis count
      const { profile: updatedProfile } = await getCurrentUserProfile();
      if (updatedProfile) setProfile(updatedProfile);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Upload failed.');
    }
  }, [profile, sideFile, frontFile, toast, router, uploadVideos]);

  const remaining = useMemo(() => (
    profile?.analysis_limit && profile.analysis_count !== undefined
      ? profile.analysis_limit - profile.analysis_count
      : 0
  ), [profile?.analysis_limit, profile?.analysis_count]);

  const hasResult = useMemo(() => isCompleted && result?.result, [isCompleted, result]);
  const overlayUrl = useMemo(() => (hasResult && result?.result ? absUrl(result.result.overlay_url || '') : ''), [hasResult, result]);
  const overlaySideUrl = useMemo(() => (hasResult && result?.result ? absUrl(result.result.overlay_side_url || '') : ''), [hasResult, result]);
  const overlayFrontUrl = useMemo(() => (hasResult && result?.result ? absUrl(result.result.overlay_front_url || '') : ''), [hasResult, result]);
  const pdfUrl = useMemo(() => (hasResult && result?.result ? absUrl(result.result.practice_plan_pdf_url || '') : ''), [hasResult, result]);
  const lessonPlan = useMemo(() => (hasResult && result?.result ? result.result.lesson_plan : null), [hasResult, result]);

  return (
    <ProtectedRoute>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <DashboardLayout
        user={initialUser ? { email: initialUser.email } : null}
        onSignOut={handleSignOut}
      >
        <div className="space-y-6">
          {/* Header Section */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Video Analysis Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Upload your throw videos and get AI-powered coaching insights
            </p>
          </div>

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

          {/* Main Content Grid: Left (Upload) + Right (Results) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Left Column: Upload Area */}
            <ErrorBoundary>
              <Card>
                <CardHeader>
                  <CardTitle>Upload Videos</CardTitle>
                  <CardDescription>
                    Upload side-on and/or front-on videos. If you upload both, we combine them into one analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profile?.is_paid ? (
                    <form onSubmit={handleUpload} className="space-y-4">
                      <UploadCard
                        label="Side-on video (recommended)"
                        hint="Best for elbow path, tempo, and release-line mechanics."
                        file={sideFile}
                        setFile={setSideFile}
                        busy={isUploading || isAnalyzing}
                        validate={validateUploadFile}
                      />

                      <UploadCard
                        label="Front-on video (optional)"
                        hint="Best for sway, alignment, and shoulder/hip drift."
                        file={frontFile}
                        setFile={setFrontFile}
                        busy={isUploading || isAnalyzing}
                        validate={validateUploadFile}
                      />

                      {/* Progress Indicator */}
                      <ProgressIndicator
                        onCancel={() => {
                          setSideFile(null);
                          setFrontFile(null);
                        }}
                        showCancelButton={true}
                      />

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        type="submit"
                        disabled={isUploading || isAnalyzing || (!sideFile && !frontFile) || remaining <= 0}
                        isLoading={isUploading || isAnalyzing}
                      >
                        {isUploading || isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {progressMessage || 'Processing...'}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-5 w-5" />
                            Analyze Videos
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Purchase a Plan to Get Started
                          </h3>
                          <p className="text-gray-700 mb-4">
                            You need to purchase a plan to analyze your throws.
                          </p>
                          <Link href="/pricing">
                            <Button variant="primary">View Pricing Plans</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </ErrorBoundary>

            {/* Right Column: Results Display */}
            <ErrorBoundary>
              {hasResult ? (
                <div className="space-y-6">
                  {/* Overlay Video */}
                  <OverlayPanel
                    overlayUrl={overlayUrl}
                    overlaySideUrl={overlaySideUrl}
                    overlayFrontUrl={overlayFrontUrl}
                  />

                  {/* Practice Plan */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Practice Plan</CardTitle>
                        {pdfUrl && (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            PDF
                          </a>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <PracticePlanView
                        plan={result?.result?.practice_plan}
                        lesson={lessonPlan}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                    <CardDescription>
                      Results will appear here after you upload and analyze videos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmptyState
                      title="No results yet"
                      subtitle="Upload a video to generate your first coaching report."
                    />
                  </CardContent>
                </Card>
              )}
            </ErrorBoundary>
          </div>

          {/* Bottom Section: Job History Table */}
          <ErrorBoundary>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Analysis History</CardTitle>
                    <CardDescription>
                      View all your previous analyses
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const jobs = await refreshHistory();
                        toast.success(`Refreshed ${jobs?.length || 0} analyses`, 2000);
                      } catch (error: any) {
                        console.error('Failed to refresh history:', error);
                        const errorMessage = error?.message || 'Failed to refresh history';
                        toast.error(errorMessage, 5000);
                      }
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading && history.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : history.length === 0 ? (
                  <EmptyState
                    title="No analyses yet"
                    subtitle="Upload a video to generate your first report."
                  />
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Filename</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Throws</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((job) => (
                            <tr
                              key={job.job_id}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                                {fmtDate(job.created_at_unix)}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <div className="font-medium text-gray-900">
                                  {job.original_filename || '(unknown)'}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={job.status} />
                                  {job.status === 'running' && typeof job.progress === 'number' && (
                                    <span className="text-xs text-gray-500">
                                      {Math.round((job.progress || 0) * 100)}%
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {typeof job.throws_detected === 'number' ? job.throws_detected : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/analyze/${job.job_id}`)}
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {history.map((job) => (
                        <Card key={job.job_id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {job.original_filename || '(unknown)'}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {fmtDate(job.created_at_unix)}
                                  </p>
                                </div>
                                <StatusBadge status={job.status} />
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="text-sm text-gray-600">
                                  {typeof job.throws_detected === 'number' ? (
                                    <span>{job.throws_detected} throws</span>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/analyze/${job.job_id}`)}
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </ErrorBoundary>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
