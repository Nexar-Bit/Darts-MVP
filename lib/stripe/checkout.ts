import { getStripe } from './stripeClient';
import type { Stripe } from 'stripe';

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  priceId: string;
  mode: 'subscription' | 'payment';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Creates a Stripe Checkout Session
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  priceId,
  mode,
  successUrl,
  cancelUrl,
  metadata = {},
}: CreateCheckoutSessionParams): Promise<{
  sessionId: string;
  url: string | null;
  error?: string;
}> {
  try {
    const session = await getStripe().checkout.sessions.create({
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        ...metadata,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Enable PayPal (explicitly)
      // Note: Apple Pay is automatically available when enabled in Stripe Dashboard
      // and the customer is on a supported device (Safari on iOS/macOS, Chrome on iOS)
      // Apple Pay doesn't need to be in payment_method_types - it's handled automatically
      payment_method_types: ['card', 'paypal'],
      // Subscription-specific settings
      ...(mode === 'subscription' && {
        subscription_data: {
          metadata: {
            userId,
            ...metadata,
          },
        },
      }),
      // For one-time payments, ensure customer creation and metadata
      ...(mode === 'payment' && {
        customer_creation: 'always',
        payment_intent_data: {
          metadata: {
            userId,
            ...metadata,
          },
        },
      }),
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      sessionId: '',
      url: null,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Retrieves a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string): Promise<{
  session: Stripe.Checkout.Session | null;
  error?: string;
}> {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    return { session };
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return {
      session: null,
      error: error instanceof Error ? error.message : 'Failed to retrieve checkout session',
    };
  }
}
