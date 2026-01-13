import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Zap, Target, BarChart3 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function Home() {
  const features = [
    {
      title: 'Instant Analysis',
      description: 'Get real-time feedback and insights powered by advanced technology. Make data-driven decisions faster.',
      icon: Zap,
    },
    {
      title: 'Personalized Plans',
      description: 'Receive customized recommendations tailored to your specific needs and goals.',
      icon: Target,
    },
    {
      title: 'Track Progress',
      description: 'Monitor your performance with detailed analytics and see your improvement over time.',
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-50 via-white to-white py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Powered by Advanced Technology</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Transform Your Performance
              <span className="block text-blue-600">With Smart Insights</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
              Get instant, actionable feedback and personalized guidance to help you achieve your goals faster.
            </p>
            <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
              Join thousands of users who are already seeing results with our platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Start analyzing your throws today • Simple pricing • No hidden fees
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to accelerate your progress and deliver real results
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} variant="elevated" className="hover:shadow-xl transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mb-6 mx-auto">
                      <IconComponent className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-center leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Thousands Trust Us
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Built with your success in mind, every feature is designed to help you achieve better results
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                'Real-time feedback and analysis',
                'Personalized recommendations',
                'Secure and private by default',
                '24/7 customer support',
                'Easy-to-use interface',
                'Regular feature updates',
                'Detailed progress tracking',
                'Mobile-friendly experience',
                'Industry-leading security',
              ].map((benefit, index) => (
                <div key={index} className="flex items-start bg-white p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                  <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to Transform Your Results?
            </h2>
            <p className="text-xl text-blue-100 mb-6">
              Join thousands of users who are already improving their performance
            </p>
            <p className="text-lg text-blue-200 mb-10">
              Get started with instant throw analysis today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="shadow-xl hover:shadow-2xl transition-shadow">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
