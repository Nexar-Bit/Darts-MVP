'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Singleton Supabase client instance for client components
 * This prevents multiple instances from being created
 */
let clientInstance: ReturnType<typeof createClient> | null = null;

/**
 * Gets or creates a singleton Supabase client for use in client components
 * This client is safe to use in the browser and prevents multiple instances
 */
export function createSupabaseClient() {
  if (clientInstance) {
    return clientInstance;
  }

  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
