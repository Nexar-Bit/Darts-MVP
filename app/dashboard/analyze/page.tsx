'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/supabase/database';
import UploadCard, { validateUploadFile } from '@/components/dashboard/UploadCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import EmptyState from '@/components/dashboard/EmptyState';
import RecentResults from '@/components/dashboard/RecentResults';
import { uploadVideo, getUserJobs } from '@/lib/api';

interface JobListItem {
  job_id: string;
  user_id: string;
  created_at_unix: number;
  original_filename?: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress?: number | null;
  stage?: string | null;
  error_message?: string | null;
  throws_detected?: number | null;
}

function fmtDate(unixSeconds: number) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString();
}

function AnalyzePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState('');

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

  useEffect(() => {
    if (user) {
      loadJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login', { scroll: false });
  };

  async function loadJobs() {
    if (!user) return;
    
    setListErr('');
    setListLoading(true);
    try {
      const jobsList = await getUserJobs(user.id, 100);
      console.log('Loaded jobs:', jobsList?.length || 0, jobsList);
      setJobs(jobsList || []);
    } catch (e: any) {
      console.error('Error loading jobs:', e);
      setListErr(e?.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setListLoading(false);
    }
  }

  const checkUsageLimit = (): { canAnalyze: boolean; message: string } => {
    if (!profile) {
      return { canAnalyze: false, message: 'Profile not loaded' };
    }

    if (!profile.is_paid) {
      return { canAnalyze: false, message: 'You need to purchase a plan to analyze throws' };
    }

    if (!profile.analysis_limit || profile.analysis_limit === 0) {
      return { canAnalyze: false, message: 'No analysis limit set. Please contact support.' };
    }

    const remaining = profile.analysis_limit - (profile.analysis_count || 0);
    if (remaining <= 0) {
      if (profile.plan_type === 'starter') {
        return { canAnalyze: false, message: 'You have used all 3 analyses from your Starter Plan. Please upgrade to Monthly Plan for more analyses.' };
      } else {
        return { canAnalyze: false, message: 'You have reached your monthly analysis limit. Your limit will reset next month.' };
      }
    }

    return { canAnalyze: true, message: '' };
  };

  function openDetail(jobId: string) {
    router.push(`/dashboard/analyze/${jobId}`);
  }

  async function startUpload(e: React.FormEvent) {
    e.preventDefault();
    
    const { canAnalyze, message } = checkUsageLimit();
    if (!canAnalyze) {
      toast.error(message);
      return;
    }

    if (!sideFile && !frontFile) {
      toast.error('Upload at least one video: side-on and/or front-on.');
      return;
    }

    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    setUploading(true);
    toast.info('Uploading video and starting analysis...');

    try {
      // Validate again
      if (sideFile) {
        const v = await validateUploadFile(sideFile);
        if (!v.ok) throw new Error(`Side-on: ${v.message}`);
      }
      if (frontFile) {
        const v = await validateUploadFile(frontFile);
        if (!v.ok) throw new Error(`Front-on: ${v.message}`);
      }

      // Upload using API client
      const result = await uploadVideo(sideFile || null, frontFile || null, user.id);
      
      toast.success('Upload complete. Starting analysis…');
      setSideFile(null);
      setFrontFile(null);

      // Refresh jobs list before navigating
      await loadJobs();
      
      // Small delay to ensure state updates
      setTimeout(() => {
        openDetail(result.job_id);
      }, 100);
    } catch (e: any) {
      console.error('Upload error:', e);
      toast.error(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

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

  const { canAnalyze, message } = checkUsageLimit();
  const remaining = profile?.analysis_limit && profile.analysis_count !== undefined
    ? profile.analysis_limit - profile.analysis_count
    : 0;

  return (
    <ProtectedRoute requirePaid={true}>
      <DashboardLayout
        user={user ? { email: user.email || undefined } : null}
        onSignOut={handleSignOut}
      >
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analyze Throw</h1>
            <p className="text-gray-600 mt-2">
              Upload side-on and/or front-on. Get a drill-based coaching plan and an overlay video to review mechanics.
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

          {/* Upload Section */}
          {canAnalyze ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Upload your videos</CardTitle>
                    <CardDescription className="mt-2">
                      You can upload <strong>side-on</strong>, <strong>front-on</strong>, or <strong>both</strong>. 
                      If you upload both, we combine them into one scorecard and one plan.
                      <br />
                      Limits: max 70s per video, max 400MB per video.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {(sideFile || frontFile) ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        Choose file(s)
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={startUpload}>
                  <div className="grid gap-4">
                    <UploadCard
                      label="Side-on video (recommended)"
                      hint="Best for elbow path, tempo, and release-line mechanics."
                      file={sideFile}
                      setFile={setSideFile}
                      busy={uploading}
                      validate={validateUploadFile}
                    />

                    <UploadCard
                      label="Front-on video (optional)"
                      hint="Best for sway, alignment, and shoulder/hip drift."
                      file={frontFile}
                      setFile={setFrontFile}
                      busy={uploading}
                      validate={validateUploadFile}
                    />
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      type="submit"
                      disabled={uploading || (!sideFile && !frontFile)}
                    >
                      {uploading ? 'Uploading...' : 'Analyse video(s)'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Analysis Not Available
                    </h3>
                    <p className="text-gray-700 mb-4">{message}</p>
                    {!profile?.is_paid && (
                      <Link href="/pricing">
                        <Button variant="primary">View Pricing Plans</Button>
                      </Link>
                    )}
                    {profile?.plan_type === 'starter' && remaining === 0 && (
                      <Link href="/pricing">
                        <Button variant="primary">Upgrade to Monthly Plan</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jobs List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My analyses</CardTitle>
                <Button variant="outline" size="sm" onClick={loadJobs} disabled={listLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${listLoading ? 'animate-spin' : ''}`} />
                  {listLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {listErr ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  {listErr}
                </div>
              ) : null}

              {jobs.length === 0 && !listLoading ? (
                <EmptyState
                  title="No analyses yet"
                  subtitle="Upload a throw video to generate your first report."
                  action={
                    <Button variant="primary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                      Upload video
                    </Button>
                  }
                />
              ) : null}

              {listLoading && jobs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading…</p>
              ) : null}

              {jobs.length > 0 ? (
                <div className="space-y-2">
                  {jobs.map((j) => (
                    <button
                      key={j.job_id}
                      type="button"
                      className="w-full text-left border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                      onClick={() => openDetail(j.job_id)}
                      title="Open this job"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">
                            {j.original_filename || '(unknown)'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Last analysed: {fmtDate(j.created_at_unix)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <StatusBadge status={j.status} />
                          {j.status === 'running' && typeof j.progress === 'number' ? (
                            <span className="text-xs text-gray-500">
                              {Math.round((j.progress || 0) * 100)}%
                            </span>
                          ) : null}
                          {typeof j.throws_detected === 'number' ? (
                            <span className="text-xs text-gray-500 min-w-[60px] text-right">
                              {j.throws_detected} throws
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {j.status === 'failed' && j.error_message ? (
                        <div className="text-xs text-red-600 mt-2">{j.error_message}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AnalyzePageContent />
    </Suspense>
  );
}
