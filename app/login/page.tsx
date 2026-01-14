'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/supabase/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      toast.error('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      toast.error('Please enter a valid email address');
    }

    if (!password) {
      newErrors.password = 'Password is required';
      if (!newErrors.email) {
        toast.error('Password is required');
      }
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      if (!newErrors.email) {
        toast.error('Password must be at least 6 characters');
      }
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
    toast.info('Signing in...', 2000);

    try {
      const { user, session, error } = await signIn({
        email: email.trim(),
        password,
      });

      if (error) {
        let errorMessage = 'Invalid email or password. Please try again.';
        
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in. Check your inbox for a confirmation link.';
          toast.warning('Email not confirmed. Please check your inbox.');
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
          toast.error('Too many login attempts. Please wait and try again.');
        } else {
          errorMessage = error.message || errorMessage;
          toast.error(error.message || errorMessage);
        }

        setErrors({
          general: errorMessage,
        });
        setIsLoading(false);
        return;
      }

      if (user && session) {
        toast.success('Successfully signed in! Redirecting...', 2000);
        // Wait a bit longer to ensure session is persisted
        // Use window.location for a full page reload to ensure session is available
        setTimeout(() => {
          // Check for redirect parameter
          const redirectTo = searchParams.get('redirect') || '/dashboard';
          window.location.href = redirectTo;
        }, 1000);
      } else {
        // If no session, set loading to false
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      toast.error(errorMessage);
      setErrors({
        general: errorMessage,
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              )}

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                error={errors.email}
                placeholder="you@example.com"
                disabled={isLoading}
                required
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  error={errors.password}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  required
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/reset-password"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
