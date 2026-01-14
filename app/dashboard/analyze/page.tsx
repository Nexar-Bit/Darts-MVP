'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { getCurrentUserProfile } from '@/lib/supabase/database';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, Video, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/supabase/database';

export default function AnalyzePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
    router.push('/login', { scroll: false });
  };

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

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid video file (MP4, MOV, AVI, or WebM)');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 100MB');
      return;
    }

    setSelectedFile(file);
    toast.success('Video file selected');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    const { canAnalyze, message } = checkUsageLimit();
    if (!canAnalyze) {
      toast.error(message);
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a video file to analyze');
      return;
    }

    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    setUploading(true);
    toast.info('Uploading video and starting analysis...');

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Not authenticated');
        setUploading(false);
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('userId', user.id);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit analysis');
      }

      toast.success('Analysis submitted successfully! Processing your throw...');
      
      // Refresh profile to update analysis count
      const { profile: updatedProfile } = await getCurrentUserProfile();
      setProfile(updatedProfile);
      
      // Reset file selection
      setSelectedFile(null);
      
      // Redirect to results or dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard', { scroll: false });
        router.refresh();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting analysis:', error);
      toast.error(error.message || 'Failed to submit analysis. Please try again.');
    } finally {
      setUploading(false);
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
            <p className="text-gray-600 mt-2">Upload a video of your throw for AI analysis</p>
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
                <CardTitle>Upload Video</CardTitle>
                <CardDescription>
                  Upload a video file of your throw (MP4, MOV, AVI, or WebM, max 100MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Drag and Drop Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : selectedFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {selectedFile ? (
                    <div className="space-y-4">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        Remove File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          Drag and drop your video here
                        </p>
                        <p className="text-sm text-gray-500">or</p>
                      </div>
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <Button variant="outline" type="button">
                          Browse Files
                        </Button>
                        <input
                          id="video-upload"
                          type="file"
                          accept="video/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!selectedFile || uploading}
                  isLoading={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading and Processing...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-5 w-5" />
                      Submit for Analysis
                    </>
                  )}
                </Button>
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

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Record Your Throw</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Record from a side angle to capture your full throwing motion</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Ensure good lighting so your form is clearly visible</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Keep the camera steady or use a tripod for best results</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Record the entire throw from start to finish</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>File formats: MP4, MOV, AVI, or WebM (max 100MB)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
