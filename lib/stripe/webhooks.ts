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
 * Handles customer subscription created event
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
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
  await supabase
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
}

/**
 * Handles customer subscription updated event
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const isPaid = subscription.status === 'active' || subscription.status === 'trialing';
  
  await updateStripeSubscription(
    userId,
    subscription.id,
    isPaid
  );
}

/**
 * Handles customer subscription deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Set subscription to null and is_paid to false
  await updateStripeSubscription(userId, null, false);
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
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Ensure subscription is marked as paid
  await updateStripeSubscription(userId, subscriptionId, true);
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

  // Retrieve the subscription to get userId
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Mark subscription as unpaid if payment failed
  // You might want to handle this differently based on your business logic
  const subscriptionStatus = await getStripe().subscriptions.retrieve(subscriptionId);
  const isPaid = subscriptionStatus.status === 'active' || subscriptionStatus.status === 'trialing';
  
  await updateStripeSubscription(userId, subscriptionId, isPaid);
}

/**
 * Handles checkout session completed (for one-time payments)
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
    await updateStripeCustomerId(userId, customerId);
  }

  // Check if this is a one-time payment (Starter Plan)
  // You can identify this by checking the price ID or mode
  const mode = session.mode;
  if (mode === 'payment') {
    // One-time payment - Starter Plan
    const supabase = createSupabaseServerClient();
    await supabase
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

