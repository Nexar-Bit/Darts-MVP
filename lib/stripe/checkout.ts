import { stripe } from './stripeClient';
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
    const session = await stripe.checkout.sessions.create({
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
      // Subscription-specific settings
      ...(mode === 'subscription' && {
        subscription_data: {
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
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { session };
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return {
      session: null,
      error: error instanceof Error ? error.message : 'Failed to retrieve checkout session',
    };
  }
}
