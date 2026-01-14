import { getStripe } from './stripeClient';
import { updateStripeSubscription, updateStripeCustomerId } from '@/lib/supabase/databaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/supabaseServer';
import type { Stripe } from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification will be disabled.');
}

/**
 * Verifies the webhook signature and constructs the event
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Webhook signature verification failed');
  }
}

/**
 * Gets userId from subscription or customer metadata
 */
async function getUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  // First try subscription metadata
  if (subscription.metadata?.userId) {
    return subscription.metadata.userId;
  }

  // If not in subscription metadata, try customer metadata
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  try {
    const customer = await getStripe().customers.retrieve(customerId);
    // Narrow type: Stripe.Customer | Stripe.DeletedCustomer
    if ('deleted' in customer && customer.deleted) {
      return null;
    }

    if (customer.metadata?.userId) {
      return customer.metadata.userId;
    }
  } catch (error) {
    console.error('Error retrieving customer:', error);
  }

  return null;
}

/**
 * Handles customer subscription created event
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription);
  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  // Update customer ID if not already set
  await updateStripeCustomerId(userId, customerId);

  const isPaid = subscription.status === 'active' || subscription.status === 'trialing';
  
  // Update subscription with plan type and limits
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: subscription.id,
      is_paid: isPaid,
      plan_type: 'monthly',
      analysis_limit: 12,
      analysis_count: 0,
      last_analysis_reset: new Date().toISOString(),
      plan_purchased_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile for subscription created:', error);
  }
}

/**
 * Handles customer subscription updated event
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription);
  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  // Determine payment status based on subscription status
  const isPaid = subscription.status === 'active' || subscription.status === 'trialing';
  
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: subscription.id,
      is_paid: isPaid,
      updated_at: new Date().toISOString(),
      // If subscription is canceled or past_due, keep subscription ID but mark as unpaid
      ...(subscription.status === 'canceled' && {
        plan_type: 'free',
        analysis_limit: 0,
      }),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile for subscription updated:', error);
  }
}

/**
 * Handles customer subscription deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription);
  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  // Set subscription to null and is_paid to false
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: null,
      is_paid: false,
      plan_type: 'free',
      analysis_limit: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile for subscription deleted:', error);
  }
}

/**
 * Handles invoice payment succeeded event
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    return;
  }

  // Retrieve the subscription to get userId
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId = await getUserIdFromSubscription(subscription);
  
  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  // Ensure subscription is marked as paid
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      is_paid: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile for invoice payment succeeded:', error);
  }
}

/**
 * Handles invoice payment failed event
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    return;
  }

  // Retrieve the subscription to get userId and status
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId = await getUserIdFromSubscription(subscription);
  
  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  // Mark subscription as unpaid if payment failed
  // Check subscription status - if it's past_due or unpaid, mark as unpaid
  const isPaid = subscription.status === 'active' || subscription.status === 'trialing';
  
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      is_paid: isPaid,
      updated_at: new Date().toISOString(),
      // If subscription is past_due, keep subscription but mark as unpaid
      ...(subscription.status === 'past_due' && {
        plan_type: 'free',
      }),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile for invoice payment failed:', error);
  }
}

/**
 * Handles checkout session completed (for one-time payments and initial subscription setup)
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  if (customerId) {
    // Update customer ID in database
    await updateStripeCustomerId(userId, customerId);
    
    // Also update customer metadata in Stripe to ensure userId is available
    try {
      await getStripe().customers.update(customerId, {
        metadata: {
          userId,
        },
      });
    } catch (error) {
      console.error('Error updating customer metadata:', error);
      // Non-fatal error, continue processing
    }
  }

  const mode = session.mode;
  
  if (mode === 'payment') {
    // One-time payment - Starter Plan
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        is_paid: true,
        plan_type: 'starter',
        analysis_limit: 3,
        analysis_count: 0,
        plan_purchased_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile for checkout session completed (payment):', error);
    }
  } else if (mode === 'subscription') {
    // Subscription mode - update profile immediately
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    if (subscriptionId) {
      try {
        // Retrieve subscription to get status
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const isPaid = subscription.status === 'active' || subscription.status === 'trialing';
        
        const supabase = createSupabaseServerClient();
        const { error } = await supabase
          .from('profiles')
          .update({
            is_paid: isPaid,
            plan_type: 'monthly',
            analysis_limit: 12,
            analysis_count: 0,
            last_analysis_reset: new Date().toISOString(),
            plan_purchased_at: new Date().toISOString(),
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) {
          console.error('Error updating profile for checkout session completed (subscription):', error);
        }
      } catch (error) {
        console.error('Error retrieving subscription in checkout handler:', error);
        // Fallback: subscription.created webhook will handle it
      }
    } else {
      console.log('No subscription ID in checkout session - subscription.created event will handle details');
    }
  }
}

/**
 * Main webhook event handler
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

