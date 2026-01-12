import { stripe } from './stripeClient';

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

/**
 * Creates a Stripe Customer Portal session
 * Allows customers to manage their subscription, update payment methods, etc.
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: CreatePortalSessionParams): Promise<{
  url: string | null;
  error?: string;
}> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  } catch (error) {
    console.error('Error creating portal session:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    };
  }
}

/**
 * Retrieves a customer by ID
 */
export async function getCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return { customer, error: null };
  } catch (error) {
    console.error('Error retrieving customer:', error);
    return {
      customer: null,
      error: error instanceof Error ? error.message : 'Failed to retrieve customer',
    };
  }
}

/**
 * Creates a Stripe customer
 */
export async function createCustomer({
  email,
  userId,
  metadata = {},
}: {
  email: string;
  userId: string;
  metadata?: Record<string, string>;
}): Promise<{
  customerId: string | null;
  error?: string;
}> {
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
        ...metadata,
      },
    });

    return {
      customerId: customer.id,
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    return {
      customerId: null,
      error: error instanceof Error ? error.message : 'Failed to create customer',
    };
  }
}
