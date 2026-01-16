'use client';

// This page runs entirely on the client and should not be statically pre-rendered.
// Mark it as dynamic to avoid build-time data collection issues.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useEffect, useState, Suspense, useRef } from 'react';
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
  const hasProcessed = useRef(false);
  const redirecting = useRef(false);

  useEffect(() => {
    // Prevent multiple executions (React Strict Mode in dev)
    if (hasProcessed.current) {
      return;
    }

    const handleAuthCallback = async () => {
      hasProcessed.current = true;
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
          if (!redirecting.current) {
            toast.error(errorDescription || error || 'Authentication failed');
          }
          
          if (!redirecting.current) {
            redirecting.current = true;
            setTimeout(() => {
              window.location.href = '/login';
            }, 3000);
          }
          return;
        }

        // Check if this is a password reset flow
        if (type === 'recovery' || window.location.pathname.includes('reset-password')) {
          // For password reset, redirect to the reset password page
          // The tokens will be in the URL hash, so we preserve them
          const currentUrl = window.location.href;
          router.push(`/auth/reset-password${window.location.hash || window.location.search}`);
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
              // Only show toast once
              if (!redirecting.current) {
                toast.success('Email confirmed! Your account has been activated.');
              }
            } else {
              setMessage('Successfully authenticated!');
              // Only show toast once
              if (!redirecting.current) {
                toast.success('Successfully authenticated!');
              }
            }

            // Redirect to dashboard or next URL
            const next = searchParams.get('next') || '/dashboard';
            
            // Use window.location for a full page redirect to prevent issues
            if (!redirecting.current) {
              redirecting.current = true;
              setTimeout(() => {
                window.location.href = next;
              }, 1000);
            }
            return;
          }
        }

        // Check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          setMessage('You are already signed in.');
          // Only show toast once
          if (!redirecting.current) {
            toast.success('You are already signed in.');
          }
          
          const next = searchParams.get('next') || '/dashboard';
          
          // Use window.location for a full page redirect to prevent issues
          if (!redirecting.current) {
            redirecting.current = true;
            setTimeout(() => {
              window.location.href = next;
            }, 1000);
          }
          return;
        }

        // If we get here, something went wrong
        setStatus('error');
        setMessage('Unable to complete authentication. Please try again.');
        if (!redirecting.current) {
          toast.error('Unable to complete authentication. Please try again.');
        }
        
        if (!redirecting.current) {
          redirecting.current = true;
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred during authentication.');
        if (!redirecting.current) {
          toast.error(error.message || 'An error occurred during authentication.');
        }
        
        if (!redirecting.current) {
          redirecting.current = true;
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        }
      }
    };

    handleAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
                    <p className="text-sm text-gray-500 mt-2 mb-4">Redirecting...</p>
                    <button
                      onClick={() => {
                        const next = searchParams.get('next') || '/dashboard';
                        window.location.href = next;
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Click here if you&apos;re not redirected automatically
                    </button>
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
                    <p className="text-sm text-gray-500 mt-2 mb-4">Redirecting to login...</p>
                    <button
                      onClick={() => {
                        window.location.href = '/login';
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Click here to go to login
                    </button>
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
