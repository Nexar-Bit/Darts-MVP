'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Settings as SettingsIcon, Bell, Lock, Trash2, AlertTriangle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({
    email: true,
    marketing: false,
    updates: true,
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
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

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    // Here you would typically save to database
    // For now, we'll just update local state
  };

  const handleSaveNotifications = () => {
    // Save notification preferences to database
    // This is a placeholder - you would implement actual saving logic
    console.log('Saving notification preferences:', notifications);
    // Show success message
    alert('Notification preferences saved!');
  };

  const handleDeleteAccount = () => {
    // This is a placeholder - you would implement actual account deletion
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (confirmed) {
      console.log('Account deletion requested');
      // Implement account deletion logic
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

  return (
    <ProtectedRoute>
      <DashboardLayout
        user={user ? { email: user.email || undefined } : null}
        onSignOut={handleSignOut}
      >
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-600 mr-2" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive notifications via email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={() => handleNotificationChange('email')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Marketing Emails</p>
                  <p className="text-sm text-gray-600">
                    Receive marketing and promotional emails
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.marketing}
                    onChange={() => handleNotificationChange('marketing')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Product Updates</p>
                  <p className="text-sm text-gray-600">
                    Receive updates about new features and improvements
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.updates}
                    onChange={() => handleNotificationChange('updates')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t">
                <Button variant="primary" onClick={handleSaveNotifications}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Lock className="h-5 w-5 text-gray-600 mr-2" />
                <CardTitle>Privacy & Security</CardTitle>
              </div>
              <CardDescription>
                Manage your privacy and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="py-2">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Password
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  To change your password, please use the password reset functionality.
                </p>
                <a href="/reset-password">
                  <Button variant="outline" size="sm">
                    Reset Password
                  </Button>
                </a>
              </div>

              <div className="py-2 border-t">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Data & Privacy
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  View our privacy policy to understand how we handle your data.
                </p>
                <a href="/privacy">
                  <Button variant="outline" size="sm">
                    View Privacy Policy
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Profile</p>
                  <p className="text-sm text-gray-600">
                    Update your profile information
                  </p>
                </div>
                <a href="/dashboard/profile">
                  <Button variant="outline" size="sm">
                    Go to Profile
                  </Button>
                </a>
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <p className="text-sm font-medium text-gray-900">Billing</p>
                  <p className="text-sm text-gray-600">
                    Manage your subscription and billing
                  </p>
                </div>
                <a href="/dashboard/billing">
                  <Button variant="outline" size="sm">
                    Go to Billing
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <CardTitle className="text-red-900">Danger Zone</CardTitle>
              </div>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delete Account</p>
                    <p className="text-sm text-gray-600">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAccount}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
