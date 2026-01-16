'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, CreditCard, Smartphone, Wallet } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';

interface PricingPlan {
  name: string;
  price: string;
  priceType: 'one-time' | 'monthly';
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  priceId?: string; // Stripe Price ID - you'll need to add these
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  const plans: PricingPlan[] = [
    {
      name: 'Starter Plan',
      price: '£20',
      priceType: 'one-time',
      description: 'Perfect for trying out our analysis',
      features: [
        '3x throw analysis',
        '1 week training plan',
        'Detailed feedback report',
        'Email support',
      ],
      cta: 'Get Started',
      priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_starter', // Set in .env.local
    },
    {
      name: 'Monthly Plan',
      price: '£60',
      priceType: 'monthly',
      description: 'Best value for regular practice',
      features: [
        '12x throw analysis per month',
        '4 week training plan',
        'Detailed feedback reports',
        'Progress tracking',
        'Priority email support',
        'Cancel anytime',
      ],
      cta: 'Subscribe Now',
      popular: true,
      priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly', // Set in .env.local
    },
  ];

  const handleCheckout = async (plan: PricingPlan) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push('/signup?redirect=/pricing', { scroll: false });
      return;
    }

    setLoading(plan.priceId || '');

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login?redirect=/pricing', { scroll: false });
        return;
      }

      // Determine checkout mode
      const mode = plan.priceType === 'one-time' ? 'payment' : 'subscription';

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Failed to start checkout. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that works best for your training needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              variant={plan.popular ? 'pricing' : 'default'}
              className={plan.popular ? 'border-blue-500 relative' : ''}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {plan.priceType === 'one-time' ? 'one-time' : '/month'}
                  </span>
                </div>
                {plan.priceType === 'monthly' && (
                  <p className="text-sm text-gray-500 mt-2">
                    Billed monthly • Cancel anytime
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full"
                  onClick={() => handleCheckout(plan)}
                  isLoading={loading === plan.priceId}
                  disabled={loading !== null}
                >
                  {loading === plan.priceId ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-600 mb-4">Secure payment methods</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-gray-600">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm">Card</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Smartphone className="h-5 w-5" />
              <span className="text-sm">Apple Pay</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Wallet className="h-5 w-5" />
              <span className="text-sm">PayPal</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            All payments are processed securely through Stripe
          </p>
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Have questions about pricing?
          </p>
          <Link href="/faq">
            <Button variant="outline">View FAQ</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
