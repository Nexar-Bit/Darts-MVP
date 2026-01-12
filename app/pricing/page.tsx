'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';

interface PricingPlan {
  name: string;
  price: {
    monthly: string;
    yearly: string;
  };
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans: PricingPlan[] = [
    {
      name: 'Free',
      price: {
        monthly: '$0',
        yearly: '$0',
      },
      description: 'Perfect for getting started',
      features: [
        'Basic features',
        'Up to 10 projects',
        'Community support',
        '1GB storage',
      ],
      cta: 'Get Started',
    },
    {
      name: 'Pro',
      price: {
        monthly: '$29',
        yearly: '$290',
      },
      description: 'For growing businesses',
      features: [
        'All free features',
        'Unlimited projects',
        'Priority support',
        '100GB storage',
        'Advanced analytics',
        'Custom integrations',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: {
        monthly: '$99',
        yearly: '$990',
      },
      description: 'For large organizations',
      features: [
        'All pro features',
        'Unlimited everything',
        '24/7 dedicated support',
        'Unlimited storage',
        'Custom SLA',
        'On-premise deployment',
        'Advanced security',
      ],
      cta: 'Contact Sales',
    },
  ];

  const getPrice = (plan: PricingPlan) => {
    return billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
  };

  const getYearlySavings = (plan: PricingPlan) => {
    if (plan.price.monthly === '$0') return null;
    const monthlyNum = parseInt(plan.price.monthly.replace('$', ''));
    const yearlyNum = parseInt(plan.price.yearly.replace('$', ''));
    const savings = monthlyNum * 12 - yearlyNum;
    return savings > 0 ? savings : null;
  };

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Choose the perfect plan for your needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 text-sm text-green-600 font-medium">
                Save up to 17%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const savings = getYearlySavings(plan);
            return (
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
                      {getPrice(plan)}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {savings && billingCycle === 'yearly' && (
                    <p className="text-sm text-green-600 mt-2">
                      Save ${savings} per year
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
                  <Link href="/signup" className="w-full">
                    <Button
                      variant={plan.popular ? 'primary' : 'outline'}
                      size="lg"
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
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
