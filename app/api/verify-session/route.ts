import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/supabaseServer';
import { getStripe } from '@/lib/stripe/stripeClient';
import { getCheckoutSession } from '@/lib/stripe/checkout';

/**
 * Verifies a Stripe checkout session and updates user profile if payment was successful
 * This is called after user returns from Stripe checkout to ensure profile is updated
 * even if webhook hasn't fired yet
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get token from Bearer token
    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseServerClientWithAuth(token);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const { session, error: sessionError } = await getCheckoutSession(sessionId);
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const sessionUserId = session.metadata?.userId;
    if (sessionUserId !== user.id) {
      return NextResponse.json(
        { error: 'Session does not belong to this user' },
        { status: 403 }
      );
    }

    // Check session status - for completed sessions
    const mode = session.mode;
    const paymentStatus = session.payment_status;
    const sessionStatus = session.status; // 'complete', 'expired', 'open'
    
    console.log('Session verification:', {
      sessionId,
      mode,
      paymentStatus,
      sessionStatus,
      userId: user.id,
    });

    // Only process if session is complete
    if (sessionStatus === 'complete') {
      // Get user profile
      const supabaseServer = createSupabaseServerClient();
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Determine plan type based on mode
      const isPaid = paymentStatus === 'paid';
      
      if (mode === 'payment') {
        // One-time payment - Starter Plan
        // Only update if payment is actually paid
        if (isPaid) {
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id;

          const updates: any = {
            is_paid: true,
            plan_type: 'starter',
            analysis_limit: 3,
            analysis_count: 0,
            plan_purchased_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (customerId) {
            updates.stripe_customer_id = customerId;
          }

          const { error: updateError } = await supabaseServer
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json(
              { error: 'Failed to update profile', updated: false, details: updateError },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            updated: true,
            planType: 'starter',
            isPaid: true,
          });
        } else {
          // Payment not completed yet
          return NextResponse.json({
            success: true,
            updated: false,
            message: `Payment status is ${paymentStatus}, waiting for payment to complete`,
            paymentStatus,
          });
        }
      } else if (mode === 'subscription') {
        // Subscription - check subscription status
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (subscriptionId) {
          try {
            const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
            const customerId = typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id;

            const isActive = subscription.status === 'active' || subscription.status === 'trialing';

            console.log('Subscription details:', {
              subscriptionId,
              status: subscription.status,
              isActive,
              customerId,
            });

            const updates: any = {
              is_paid: isActive,
              plan_type: 'monthly',
              analysis_limit: 12,
              analysis_count: 0,
              last_analysis_reset: new Date().toISOString(),
              plan_purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              stripe_subscription_id: subscriptionId,
            };

            if (customerId) {
              updates.stripe_customer_id = customerId;
            }

            const { error: updateError, data: updatedProfile } = await supabaseServer
              .from('profiles')
              .update(updates)
              .eq('id', user.id)
              .select()
              .single();

            if (updateError) {
              console.error('Error updating profile:', updateError);
              return NextResponse.json(
                { error: 'Failed to update profile', updated: false, details: updateError },
                { status: 500 }
              );
            }

            console.log('Profile updated successfully:', updatedProfile);

            return NextResponse.json({
              success: true,
              updated: true,
              planType: 'monthly',
              isPaid: isActive,
              subscriptionStatus: subscription.status,
            });
          } catch (error: any) {
            console.error('Error retrieving subscription:', error);
            return NextResponse.json(
              { error: 'Failed to verify subscription', updated: false, details: error.message },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json({
            success: true,
            updated: false,
            message: 'No subscription ID found in session',
          });
        }
      }
    }

    // Session not complete or payment not successful
    return NextResponse.json({
      success: true,
      updated: false,
      message: `Session status: ${sessionStatus}, Payment status: ${paymentStatus}`,
      sessionStatus,
      paymentStatus,
    });
  } catch (error) {
    console.error('Error in verify-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
