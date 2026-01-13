import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe secret key from environment variables
 */
function getStripeSecretKey(): string {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }
  return stripeSecretKey;
}

/**
 * Stripe client instance for server-side use
 * Only use this in API routes and server components
 * Initialized lazily to avoid build-time errors
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getStripeSecretKey(), {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Get Stripe publishable key (safe for client-side)
 */
export function getStripePublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
  }
  return publishableKey;
}
