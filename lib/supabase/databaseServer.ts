import { createSupabaseServerClient } from './supabaseServer';

export interface UserProfile {
  id: string;
  email: string | null;
  is_paid: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string;
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
