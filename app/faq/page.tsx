import Accordion, { AccordionItem } from '@/components/ui/Accordion';

export default function FAQPage() {
  const faqItems: AccordionItem[] = [
    {
      question: 'What is your platform?',
      answer: 'Our platform is a comprehensive solution designed to help you build amazing products. We provide all the tools and features you need to succeed, from basic functionality to advanced capabilities.',
    },
    {
      question: 'How do I get started?',
      answer: 'Getting started is easy! Simply sign up for an account, choose a plan that fits your needs, and start analyzing your throws. You can choose between our Starter Plan (3x throw analysis) or Monthly Plan (12x throw analysis per month).',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. All payments are processed securely through Stripe.',
    },
    {
      question: 'Can I change my plan later?',
      answer: 'Yes! If you\'re on the Starter Plan, you can upgrade to the Monthly Plan at any time. Monthly subscribers can cancel anytime, and your subscription will remain active until the end of your current billing period.',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'We offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied with our service, contact our support team within 30 days of your purchase for a full refund.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, security is our top priority. We use industry-leading encryption standards, regular security audits, and comply with all major data protection regulations. Your data is stored securely and backed up regularly.',
    },
    {
      question: 'What kind of support do you offer?',
      answer: 'We offer different levels of support depending on your plan. Free users get community support, Pro users get priority email support, and Enterprise users get 24/7 dedicated support with a dedicated account manager.',
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time from your account settings. Your subscription will remain active until the end of your current billing period, and you won\'t be charged again.',
    },
    {
      question: 'What\'s the difference between the Starter and Monthly plans?',
      answer: 'The Starter Plan (£20 one-time) includes 3 throw analyses with a 1-week training plan - perfect for trying out our service. The Monthly Plan (£60/month) includes 12 throw analyses per month with a 4-week training plan, plus progress tracking and priority support - ideal for regular practice.',
    },
    {
      question: 'How do I contact support?',
      answer: 'You can contact our support team through the contact form on our website, email us at support@example.com, or use the in-app chat feature if you\'re on a Pro or Enterprise plan.',
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600">
              Find answers to common questions about our platform
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion items={faqItems} />

          {/* Contact CTA */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-4">
              Still have questions? We&apos;re here to help!
            </p>
            <a
              href="/contact"
              className="inline-block text-blue-600 font-medium hover:text-blue-700"
            >
              Contact Us →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
