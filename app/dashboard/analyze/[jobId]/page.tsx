'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/supabase/database';
import StatusBadge from '@/components/dashboard/StatusBadge';
import OverlayPanel from '@/components/dashboard/OverlayPanel';
import PracticePlanView from '@/components/dashboard/PracticePlanView';
import RecentResults from '@/components/dashboard/RecentResults';
import { absUrl, getJobStatus, getUserJobs, type JobStatus } from '@/lib/api';

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

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const jobId = params?.jobId as string;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<JobStatus | null>(null);
  const [detailErr, setDetailErr] = useState('');
  const [polling, setPolling] = useState(false);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

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

  async function loadJobs() {
    if (!user) return;
    
    try {
      const jobsList = await getUserJobs(user.id, 100);
      setJobs(jobsList);
    } catch (e: any) {
      console.error('Error loading jobs:', e);
    }
  }

  async function loadJobStatus(jobId: string) {
    if (!user) return null;
    
    const status = await getJobStatus(jobId);
    setDetail(status);
    return status;
  }

  useEffect(() => {
    if (!jobId || !user) return;
    
    cancelledRef.current = false;
    let timer: NodeJS.Timeout | null = null;

    async function loop() {
      if (cancelledRef.current) return;
      
      setDetailErr('');

      try {
        const j = await loadJobStatus(jobId);
        if (cancelledRef.current || !j) return;

        const done = j.status === 'done' || j.status === 'failed' || j.status === 'not_found';
        if (done) {
          setPolling(false);
          loadJobs();
          return;
        }

        setPolling(true);
        timer = setTimeout(loop, 1000);
      } catch (e: any) {
        if (!cancelledRef.current) {
          setDetailErr(e?.message || 'Failed to load status');
          setPolling(false);
          timer = setTimeout(loop, 1500);
        }
      }
    }

    loadJobStatus(jobId);
    loop();

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, user]);

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

  function backToList() {
    router.push('/dashboard/analyze');
  }

  function startNewAnalysis() {
    router.push('/dashboard/analyze');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDetail(jobId: string) {
    router.push(`/dashboard/analyze/${jobId}`);
  }

  const overlayUrl = useMemo(() => absUrl(detail?.result?.overlay_url || ''), [detail]);
  const overlaySideUrl = useMemo(() => absUrl(detail?.result?.overlay_side_url || ''), [detail]);
  const overlayFrontUrl = useMemo(() => absUrl(detail?.result?.overlay_front_url || ''), [detail]);
  const pdfUrl = useMemo(() => absUrl(detail?.result?.practice_plan_pdf_url || ''), [detail]);
  const lessonPlan = useMemo(() => detail?.result?.lesson_plan || null, [detail]);

  const progressPct = useMemo(() => {
    if (!detail) return 0;
    if (typeof detail.progress === 'number') return Math.max(0, Math.min(100, Math.round(detail.progress * 100)));
    return detail.status === 'queued' ? 5 : 10;
  }, [detail]);

  const isWorking = !!detail && (detail.status === 'queued' || detail.status === 'running');

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
    <ProtectedRoute requirePaid={true}>
      <DashboardLayout
        user={user ? { email: user.email || undefined } : null}
        onSignOut={handleSignOut}
      >
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
        <div className="space-y-8">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Analysis</CardTitle>
                  <CardDescription className="mt-2">
                    Job: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{jobId}</code>{' '}
                    {polling ? <span className="text-blue-600">(updating…)</span> : null}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={startNewAnalysis}>
                    Start new analysis
                  </Button>
                  <Button variant="outline" size="sm" onClick={backToList}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {detail?.status ? <StatusBadge status={detail.status} /> : null}
                {detail?.stage ? (
                  <span className="text-sm text-gray-500">Stage: {detail.stage}</span>
                ) : null}
                {typeof detail?.progress === 'number' ? (
                  <span className="text-sm text-gray-500">
                    Progress: {Math.round(detail.progress * 100)}%
                  </span>
                ) : null}
              </div>

              {detailErr ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {detailErr}
                </div>
              ) : null}

              {detail && isWorking ? (
                <div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300 ${
                        isWorking ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {detail.status === 'queued' ? 'Queued…' : `Working… ${progressPct}%`}
                  </div>
                </div>
              ) : null}

              {detail?.status === 'failed' ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {detail?.error?.message || 'Failed'}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Results Grid */}
          {detail?.status === 'done' ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-6">
              {/* Left Column - Practice Plan */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Practice plan</CardTitle>
                      {pdfUrl ? (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </a>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PracticePlanView plan={detail.result?.practice_plan} lesson={lessonPlan} />
                  </CardContent>
                </Card>

                <RecentResults jobs={jobs} onOpen={openDetail} />
              </div>

              {/* Right Column - Overlay Video */}
              <div>
                <OverlayPanel
                  overlayUrl={overlayUrl}
                  overlaySideUrl={overlaySideUrl}
                  overlayFrontUrl={overlayFrontUrl}
                />
              </div>
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
