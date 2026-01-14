'use client';

import { createClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase client instance for client components
 * This prevents multiple instances from being created
 */
let clientInstance: ReturnType<typeof createClient> | null = null;
let clientUrl: string | null = null;
let clientKey: string | null = null;

/**
 * Gets or creates a singleton Supabase client for use in client components
 * This client is safe to use in the browser and prevents multiple instances
 * 
 * Note: Environment variables are read lazily to avoid build-time errors
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, create a placeholder client for build-time
  // This allows the build to succeed, but the client won't work at runtime
  // In production, make sure environment variables are set in Vercel
  const url = supabaseUrl || 'https://placeholder.supabase.co';
  const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  // Recreate client if URL or key changed (e.g., env vars were set after build)
  if (clientInstance && (clientUrl !== url || clientKey !== key)) {
    clientInstance = null;
  }

  if (clientInstance) {
    return clientInstance;
  }

  clientUrl = url;
  clientKey = key;

  clientInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    },
  });

  return clientInstance;
}

/**
 * Alias for createSupabaseClient for backward compatibility
 * Use createSupabaseClient() instead
 */
export function getSupabaseClient() {
  return createSupabaseClient();
}
