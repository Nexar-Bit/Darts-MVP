'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { updatePassword } from '@/lib/supabase/auth';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Lock, CheckCircle, ArrowLeft } from 'lucide-react';

function ResetPasswordConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Handle password reset token and session
  useEffect(() => {
    const handleResetToken = async () => {
      try {
        const supabase = createSupabaseClient();
        
        // Get tokens from URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');

        console.log('Reset password page - tokens:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        });

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setErrors({ general: 'Invalid or expired reset link. Please request a new one.' });
            setIsInitializing(false);
            return;
          }

          if (data.session) {
            console.log('Session set successfully');
            // User is now authenticated, show the password reset form
            setIsInitializing(false);
            return;
          }
        }

        // Check if user is already authenticated (might have been auto-authenticated by Supabase)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('User already has session');
          // User is authenticated, show the form
          setIsInitializing(false);
          return;
        }

        // If we have tokens but no session was created, there might be an issue
        // But still show the form - user might be able to proceed
        if (accessToken) {
          console.warn('Had tokens but no session created');
        } else {
          console.warn('No tokens found in URL');
        }
        
        // Always show the form after a short delay, even if there are issues
        // This way user can see what's wrong
        setIsInitializing(false);
      } catch (error: any) {
        console.error('Error handling reset token:', error);
        setErrors({ general: 'An error occurred. Please try again.' });
        setIsInitializing(false);
      }
    };

    // Small delay to ensure window is available
    const timer = setTimeout(() => {
      handleResetToken();
    }, 100);

    // Safety timeout - always show form after 3 seconds
    const safetyTimer = setTimeout(() => {
      console.log('Safety timeout - showing form anyway');
      setIsInitializing(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, []);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await updatePassword(password);

      if (error) {
        setErrors({ general: error.message || 'Failed to update password' });
        toast.error(error.message || 'Failed to update password');
      } else {
        setIsSuccess(true);
        toast.success('Password updated successfully!');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred';
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Loading...
              </h2>
              <p className="text-gray-600">Preparing password reset form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Password Updated</CardTitle>
            <CardDescription>
              Your password has been successfully updated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              You can now sign in with your new password.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Lock className="h-5 w-5 text-gray-600 mr-2" />
            <CardTitle>Set New Password</CardTitle>
          </div>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <p className="text-sm text-red-800">{errors.general}</p>
                <p className="text-xs text-red-600 mt-2">
                  If you&apos;re already logged in, you can still change your password here.
                </p>
              </div>
            )}
            
            {!errors.general && (
              <div className="rounded-md bg-blue-50 p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Please enter your new password. Make sure it&apos;s at least 6 characters long.
                </p>
              </div>
            )}

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              placeholder="Enter your new password"
              disabled={isLoading}
              required
              autoFocus
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              error={errors.confirmPassword}
              placeholder="Confirm your new password"
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading || !!errors.general}
            >
              Update Password
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}
