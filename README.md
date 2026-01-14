# Dart Throw Analysis Platform

A Next.js-based platform for analyzing dart throwing technique using AI. Features user authentication, subscription management via Stripe, and AI-powered video analysis.

## 🚀 Features

- **User Authentication** - Secure authentication with Supabase
- **Subscription Management** - Two-tier pricing (Starter Plan & Monthly Plan) via Stripe
- **Video Analysis** - Upload and analyze dart throwing videos with AI
- **Usage Tracking** - Track analysis usage per subscription plan
- **Customer Portal** - Manage subscriptions via Stripe Customer Portal
- **Protected Routes** - Server-side and client-side route protection
- **Responsive Design** - Modern UI with Tailwind CSS

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Supabase** account and project
- **Stripe** account (test mode for development)
- **Git** for version control

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd Init
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` and fill in all the required values (see [Environment Variables](#environment-variables) section below).

4. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the migrations in `supabase/migrations/` folder
   - Get your API keys from Project Settings > API

5. **Set up Stripe**
   - Create a Stripe account at [stripe.com](https://stripe.com)
   - Create two products:
     - **Starter Plan**: £20 one-time payment
     - **Monthly Plan**: £60/month subscription
   - Get your API keys from Developers > API keys
   - Set up webhook endpoint (see [Webhook Setup](#webhook-setup))

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_your_starter_price_id
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Optional Variables

```env
# AI Backend (optional - uses mock responses if not set)
AI_BACKEND_URL=https://your-ai-backend.com
AI_BACKEND_API_KEY=your_api_key
```

See `.env.example` for a complete template with descriptions.

## 📦 Database Setup

### Supabase Migrations

Run the migrations in order:

1. `20250120000000_create_profiles_table.sql` - Creates the profiles table
2. `20250120000001_add_usage_tracking.sql` - Adds usage tracking fields

You can run these migrations via:
- Supabase Dashboard > SQL Editor
- Supabase CLI: `supabase db push`

### Database Schema

The `profiles` table includes:
- User authentication data
- Stripe customer and subscription IDs
- Payment status (`is_paid`)
- Plan type (`starter`, `monthly`, `free`)
- Usage tracking (`analysis_count`, `analysis_limit`)
- Plan purchase timestamps

## 🔗 Webhook Setup

### Local Development

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhook`
4. Copy the webhook signing secret and add it to `.env.local`

### Production (Vercel)

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret and add it to Vercel environment variables

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see [Environment Variables](#environment-variables))
   - Deploy!

3. **Configure Environment Variables in Vercel**
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.example`
   - Make sure to set `NEXT_PUBLIC_APP_URL` to your Vercel URL

4. **Update Supabase Settings**
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Add your Vercel URL to "Site URL" and "Redirect URLs"

5. **Update Stripe Webhook**
   - Update webhook URL to your Vercel domain
   - Update webhook signing secret in Vercel environment variables

### Build Commands

- **Development**: `npm run dev`
- **Production Build**: `npm run build`
- **Start Production**: `npm start`
- **Lint**: `npm run lint`

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── analyze/       # Video analysis endpoint
│   │   ├── webhook/       # Stripe webhook handler
│   │   └── create-checkout-session/  # Stripe checkout
│   ├── dashboard/         # Protected dashboard pages
│   ├── auth/             # Authentication pages
│   └── pricing/          # Pricing page
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client and helpers
│   └── stripe/           # Stripe integration
├── supabase/              # Database migrations
│   └── migrations/      # SQL migration files
└── public/                # Static assets
```

## 🔐 Security Notes

- Never commit `.env.local` or `.env` files
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only
- `STRIPE_SECRET_KEY` is server-side only
- All `NEXT_PUBLIC_*` variables are exposed to the browser
- Webhook signatures are verified for security
- Authentication is checked on both client and server

## 🧪 Testing

### Test Stripe Payments

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiry date, any CVC, any ZIP

### Test Webhooks Locally

```bash
stripe listen --forward-to localhost:3000/api/webhook
stripe trigger checkout.session.completed
```

## 📝 API Endpoints

- `POST /api/analyze` - Upload and analyze video
- `POST /api/webhook` - Stripe webhook handler
- `POST /api/create-checkout-session` - Create Stripe checkout
- `POST /api/create-portal-session` - Create Stripe customer portal

## 🐛 Troubleshooting

### Build Errors

- Ensure all environment variables are set
- Check that Supabase and Stripe credentials are correct
- Verify Node.js version is 18+

### Authentication Issues

- Check Supabase URL and keys
- Verify email confirmation is set up correctly
- Check redirect URLs in Supabase settings

### Payment Issues

- Verify Stripe API keys are correct
- Check webhook endpoint is configured
- Ensure Price IDs match your Stripe products

### Webhook Issues

- Verify webhook signing secret matches
- Check webhook endpoint URL is correct
- Review webhook logs in Stripe Dashboard

## 📄 License

This project is private and proprietary.

## 🤝 Support

For issues and questions, please contact the development team.

## 🎯 Next Steps

After deployment:
1. Set up production Stripe account
2. Configure production Supabase project
3. Set up AI backend (if using)
4. Configure custom domain
5. Set up monitoring and analytics
