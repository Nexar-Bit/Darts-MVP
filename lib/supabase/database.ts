'use client';

import { createSupabaseClient } from './supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string | null;
  is_paid: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string;
  analysis_count?: number;
  analysis_limit?: number;
  last_analysis_reset?: string | null;
  plan_type?: 'free' | 'starter' | 'monthly';
  plan_purchased_at?: string | null;
}

/**
 * Gets the user profile from the profiles table
 */
export async function getUserProfile(userId: string): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  const supabase = createSupabaseClient();
  
  try {
    // Ensure we have a valid session before querying
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No active session for profile fetch:', sessionError);
      return {
        profile: null,
        error: null, // Auth errors are not PostgrestErrors
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Handle errors
    if (error) {
      console.error('Error fetching profile:', error);
      
      // 406 errors can mean RLS blocked the query or Accept header issue
      // Check for 406 status code in message or specific error codes
      const is406Error = error.code === 'PGRST116' || 
                        error.message?.includes('406') || 
                        error.message?.toLowerCase().includes('not acceptable');
      
      if (is406Error) {
        // Try to get more info about the error
        console.warn('Profile fetch returned 406 - RLS or header issue:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        // Return null gracefully - might be RLS blocking
        return {
          profile: null,
          error: null,
        };
      }
      
      // 404 or table doesn't exist errors
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          profile: null,
          error: null,
        };
      }
      
      return {
        profile: null,
        error: error as PostgrestError | null,
      };
    }

    return {
      profile: data as UserProfile | null,
      error: null,
    };
  } catch (error) {
    // Handle any unexpected errors gracefully
    console.error('Error fetching user profile:', error);
    return {
      profile: null,
      error: null,
    };
  }
}

/**
 * Gets the current user's profile
 */
export async function getCurrentUserProfile(): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  const supabase = createSupabaseClient();
  
  // First check session to ensure we have valid auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Session error in getCurrentUserProfile:', sessionError);
    return {
      profile: null,
      error: null, // Auth errors are not PostgrestErrors
    };
  }
  
  if (!session) {
    console.warn('No session found in getCurrentUserProfile');
    return {
      profile: null,
      error: null,
    };
  }
  
  // Get user from session or by calling getUser
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Auth error in getCurrentUserProfile:', authError);
    return {
      profile: null,
      error: null, // Auth errors are not PostgrestErrors
    };
  }

  return getUserProfile(user.id);
}

/**
 * Updates the user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'updated_at'>>
): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  const supabase = createSupabaseClient();
  
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    // If table doesn't exist, return null without error
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          profile: null,
          error: null,
        };
      }
      return {
        profile: null,
        error: error as PostgrestError | null,
      };
    }

    return {
      profile: data as UserProfile | null,
      error: null,
    };
  } catch (error) {
    // Handle any unexpected errors gracefully
    console.error('Error updating user profile:', error);
    return {
      profile: null,
      error: null,
    };
  }
}

/**
 * Updates the current user's profile
 */
export async function updateCurrentUserProfile(
  updates: Partial<Omit<UserProfile, 'id' | 'updated_at'>>
): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return {
      profile: null,
      error: null, // Auth errors are not PostgrestErrors
    };
  }

  return updateProfile(user.id, updates);
}

/**
 * Updates the user's Stripe customer ID
 */
export async function updateStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  return updateProfile(userId, {
    stripe_customer_id: stripeCustomerId,
  });
}

/**
 * Updates the user's Stripe subscription ID and paid status
 */
export async function updateStripeSubscription(
  userId: string,
  stripeSubscriptionId: string | null,
  isPaid: boolean
): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  return updateProfile(userId, {
    stripe_subscription_id: stripeSubscriptionId,
    is_paid: isPaid,
  });
}
