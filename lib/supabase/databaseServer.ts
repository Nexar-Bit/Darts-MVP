import { createSupabaseServerClient } from './supabaseServer';
import { PostgrestError } from '@supabase/supabase-js';

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
 * Updates the user's Stripe customer ID (server-side)
 */
export async function updateStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<{
  profile: UserProfile | null;
  error: any;
}> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  return {
    profile: data as UserProfile | null,
    error: error || null,
  };
}

/**
 * Updates the user's Stripe subscription ID and paid status (server-side)
 */
export async function updateStripeSubscription(
  userId: string,
  stripeSubscriptionId: string | null,
  isPaid: boolean
): Promise<{
  profile: UserProfile | null;
  error: any;
}> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: stripeSubscriptionId,
      is_paid: isPaid,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  return {
    profile: data as UserProfile | null,
    error: error || null,
  };
}

/**
 * Updates the user's analysis count, limit, and plan type (server-side)
 */
export async function updateAnalysisUsageServer(
  userId: string,
  planType: UserProfile['plan_type'],
  analysisLimit: number,
  analysisCount: number = 0,
  resetDate: string | null = null,
  planPurchasedAt: string | null = null
): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  const supabase = createSupabaseServerClient();
  
  // For monthly plans, check if we need to reset the count
  let finalAnalysisCount = analysisCount;
  let finalResetDate = resetDate;
  
  if (planType === 'monthly' && resetDate) {
    const lastReset = new Date(resetDate);
    const now = new Date();
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
    
    // Reset if it's been 30+ days since last reset
    if (daysSinceReset >= 30) {
      finalAnalysisCount = 0;
      finalResetDate = now.toISOString();
    }
  }
  
  const updates: Partial<UserProfile> = {
    plan_type: planType,
    analysis_limit: analysisLimit,
    analysis_count: finalAnalysisCount,
    updated_at: new Date().toISOString(),
  };

  if (finalResetDate) {
    updates.last_analysis_reset = finalResetDate;
  }
  if (planPurchasedAt) {
    updates.plan_purchased_at = planPurchasedAt;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates as any) // Type assertion to bypass TS error with Supabase types
    .eq('id', userId)
    .select()
    .single();

  return {
    profile: data as UserProfile | null,
    error: error as PostgrestError | null,
  };
}

/**
 * Increments the analysis count for a user (server-side)
 */
export async function incrementAnalysisCount(
  userId: string
): Promise<{
  profile: UserProfile | null;
  error: PostgrestError | null;
}> {
  const supabase = createSupabaseServerClient();
  
  // Get current profile
  const { data: currentProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !currentProfile) {
    return {
      profile: null,
      error: fetchError as PostgrestError | null,
    };
  }

  // Check limits
  const analysisLimit = currentProfile.analysis_limit || 0;
  const currentCount = currentProfile.analysis_count || 0;
  
  if (currentCount >= analysisLimit) {
    const limitError = new Error('Analysis limit reached') as any as PostgrestError;
    limitError.message = 'Analysis limit reached';
    limitError.details = `You have reached your limit of ${analysisLimit} analyses`;
    limitError.code = 'LIMIT_REACHED';
    return {
      profile: currentProfile as UserProfile,
      error: limitError,
    };
  }

  // Update with incremented count
  return updateAnalysisUsageServer(
    userId,
    currentProfile.plan_type || 'free',
    analysisLimit,
    currentCount + 1,
    currentProfile.last_analysis_reset,
    currentProfile.plan_purchased_at
  );
}
