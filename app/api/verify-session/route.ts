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

          // Build updates object
          const updates: any = {
            is_paid: true,
            plan_type: 'starter',
            plan_purchased_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Add usage tracking fields (will fail gracefully if columns don't exist)
          updates.analysis_limit = 3;
          updates.analysis_count = 0;

          if (customerId) {
            updates.stripe_customer_id = customerId;
          }

          const { error: updateError, data: updatedData } = await supabaseServer
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating profile:', updateError);
            
            // Check if error is about missing columns (PGRST204 or message contains column name)
            const isMissingColumnError = 
              updateError.code === 'PGRST204' ||
              updateError.message?.includes('analysis_count') ||
              updateError.message?.includes('analysis_limit') ||
              updateError.message?.includes('last_analysis_reset') ||
              updateError.message?.includes('plan_type') ||
              updateError.message?.includes('plan_purchased_at') ||
              updateError.message?.includes('Could not find') ||
              updateError.message?.includes('schema cache');
            
            if (isMissingColumnError) {
              console.warn('Usage tracking columns not found - updating basic fields only');
              const basicUpdates: any = {
                is_paid: true,
                plan_purchased_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              if (customerId) {
                basicUpdates.stripe_customer_id = customerId;
              }
              
              // Try to update plan_type if column exists, otherwise skip it
              try {
                basicUpdates.plan_type = 'starter';
              } catch (e) {
                // plan_type column might not exist either
                console.warn('plan_type column may not exist');
              }
              
              const { error: basicError, data: basicData } = await supabaseServer
                .from('profiles')
                .update(basicUpdates)
                .eq('id', user.id)
                .select()
                .single();
              
              if (basicError) {
                console.error('Basic update also failed:', basicError);
                // Even basic update failed - might be RLS or other issue
                return NextResponse.json(
                  { 
                    error: 'Failed to update profile. Database migration required.',
                    updated: false, 
                    details: basicError,
                    migrationRequired: true,
                  },
                  { status: 500 }
                );
              }
              
              // Basic update succeeded - return success but note migration needed
              console.log('Profile updated successfully (basic fields only - migration needed for usage tracking)');
              return NextResponse.json({
                success: true,
                updated: true,
                planType: 'starter',
                isPaid: true,
                warning: 'Database migration needed for usage tracking features',
                migrationRequired: true,
              });
            }
            
            return NextResponse.json(
              { error: 'Failed to update profile', updated: false, details: updateError },
              { status: 500 }
            );
          }

          console.log('Profile updated successfully:', updatedData);
          
          return NextResponse.json({
            success: true,
            updated: true,
            planType: 'starter',
            isPaid: true,
            profile: updatedData,
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

            // Build updates object
            const updates: any = {
              is_paid: isActive,
              plan_type: 'monthly',
              plan_purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              stripe_subscription_id: subscriptionId,
            };
            
            // Add usage tracking fields (will fail gracefully if columns don't exist)
            updates.analysis_limit = 12;
            updates.analysis_count = 0;
            updates.last_analysis_reset = new Date().toISOString();

            if (customerId) {
              updates.stripe_customer_id = customerId;
            }

            const { error: updateError, data: updatedProfileData } = await supabaseServer
              .from('profiles')
              .update(updates)
              .eq('id', user.id)
              .select()
              .single();

            if (updateError) {
              console.error('Error updating profile:', updateError);
              
              // Check if error is about missing columns (PGRST204 or message contains column name)
              const isMissingColumnError = 
                updateError.code === 'PGRST204' ||
                updateError.message?.includes('analysis_count') ||
                updateError.message?.includes('analysis_limit') ||
                updateError.message?.includes('last_analysis_reset') ||
                updateError.message?.includes('plan_type') ||
                updateError.message?.includes('plan_purchased_at') ||
                updateError.message?.includes('Could not find') ||
                updateError.message?.includes('schema cache');
              
              if (isMissingColumnError) {
                console.warn('Usage tracking columns not found - updating basic fields only');
                const basicUpdates: any = {
                  is_paid: isActive,
                  updated_at: new Date().toISOString(),
                  stripe_subscription_id: subscriptionId,
                };
                
                if (customerId) {
                  basicUpdates.stripe_customer_id = customerId;
                }
                
                // Try to add optional fields if they exist
                try {
                  basicUpdates.plan_type = 'monthly';
                  basicUpdates.plan_purchased_at = new Date().toISOString();
                } catch (e) {
                  // Columns might not exist
                  console.warn('Some columns may not exist');
                }
                
                const { error: basicError, data: basicProfile } = await supabaseServer
                  .from('profiles')
                  .update(basicUpdates)
                  .eq('id', user.id)
                  .select()
                  .single();
                
                if (basicError) {
                  console.error('Basic update also failed:', basicError);
                  return NextResponse.json(
                    { 
                      error: 'Failed to update profile. Database migration required.',
                      updated: false, 
                      details: basicError,
                      migrationRequired: true,
                    },
                    { status: 500 }
                  );
                }
                
                // Basic update succeeded - return success but note migration needed
                console.log('Profile updated successfully (basic fields only - migration needed for usage tracking)');
                return NextResponse.json({
                  success: true,
                  updated: true,
                  planType: 'monthly',
                  isPaid: isActive,
                  subscriptionStatus: subscription.status,
                  warning: 'Database migration needed for usage tracking features',
                  migrationRequired: true,
                });
              }
              
              return NextResponse.json(
                { error: 'Failed to update profile', updated: false, details: updateError },
                { status: 500 }
              );
            }

                console.log('Profile updated successfully:', updatedProfileData);

            return NextResponse.json({
              success: true,
              updated: true,
              planType: 'monthly',
              isPaid: isActive,
              subscriptionStatus: subscription.status,
              profile: updatedProfileData,
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
