'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { Card, CardContent } from '@/components/ui/Card';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createSupabaseClient();
        
        // Get the hash from the URL (Supabase puts tokens in the hash)
        // Also check query params as fallback
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const error = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        const type = hashParams.get('type') || queryParams.get('type');

        // Check for errors in the URL
        if (error) {
          setStatus('error');
          setMessage(errorDescription || error || 'Authentication failed');
          toast.error(errorDescription || error || 'Authentication failed');
          
          setTimeout(() => {
            router.push('/login', { scroll: false });
          }, 3000);
          return;
        }

        // If we have tokens, Supabase should handle them automatically
        // But we can also manually set the session if needed
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          if (data.session) {
            setStatus('success');
            
            if (type === 'signup') {
              setMessage('Email confirmed! Your account has been activated.');
              toast.success('Email confirmed! Your account has been activated.');
            } else {
              setMessage('Successfully authenticated!');
              toast.success('Successfully authenticated!');
            }

            // Redirect to dashboard or next URL
            const next = searchParams.get('next') || '/dashboard';
            setTimeout(() => {
              router.push(next, { scroll: false });
              router.refresh();
            }, 1500);
            return;
          }
        }

        // Check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          setMessage('You are already signed in.');
          toast.success('You are already signed in.');
          
          const next = searchParams.get('next') || '/dashboard';
          setTimeout(() => {
            router.push(next, { scroll: false });
            router.refresh();
          }, 1500);
          return;
        }

        // If we get here, something went wrong
        setStatus('error');
        setMessage('Unable to complete authentication. Please try again.');
        toast.error('Unable to complete authentication. Please try again.');
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred during authentication.');
        toast.error(error.message || 'An error occurred during authentication.');
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams, toast]);

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {status === 'loading' && (
                  <>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Processing...
                    </h2>
                    <p className="text-gray-600">{message}</p>
                  </>
                )}

                {status === 'success' && (
                  <>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Success!
                    </h2>
                    <p className="text-gray-600">{message}</p>
                    <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                      <svg
                        className="h-6 w-6 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Error
                    </h2>
                    <p className="text-gray-600">{message}</p>
                    <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
