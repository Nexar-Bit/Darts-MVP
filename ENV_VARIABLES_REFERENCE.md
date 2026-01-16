# Environment Variables Reference

This document lists all environment variables required for the application.

## Quick Setup

1. Create `.env.local` file in the project root
2. Copy the variables below
3. Fill in your actual values
4. Restart your development server

## Required Variables

### Application Configuration

```env
# Application URL (update after first deployment)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Base URL (for frontend API calls)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Supabase Configuration

```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (client-side safe)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Supabase Service Role Key (server-side only - NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### Stripe Configuration

```env
# Stripe Secret Key (server-side only)
# Use sk_test_... for development/preview
# Use sk_live_... for production
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# Stripe Publishable Key (client-side safe)
# Use pk_test_... for development/preview
# Use pk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_your_starter_price_id_here
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id_here

# Stripe Webhook Secret
# Get from Stripe Dashboard or Stripe CLI
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### AI Backend Configuration (Optional)

```env
# AI Backend URL (server-side only)
AI_BACKEND_URL=http://localhost:8000

# AI Backend API Key (if required)
AI_BACKEND_API_KEY=your_backend_api_key_if_required
```

## Variable Descriptions

### NEXT_PUBLIC_APP_URL
- **Type**: Public (exposed to browser)
- **Description**: Base URL of your application
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`
- **Used for**: Stripe redirects, email links, OAuth callbacks

### NEXT_PUBLIC_API_BASE_URL
- **Type**: Public (exposed to browser)
- **Description**: Base URL for AI backend API (frontend calls)
- **Development**: `http://localhost:8000`
- **Production**: `https://your-ai-backend.com`
- **Used for**: Building video URLs, PDF download links

### NEXT_PUBLIC_SUPABASE_URL
- **Type**: Public (exposed to browser)
- **Description**: Your Supabase project URL
- **Format**: `https://xxxxx.supabase.co`
- **Where to find**: Supabase Dashboard > Project Settings > API > Project URL

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Type**: Public (exposed to browser)
- **Description**: Supabase anonymous/public key
- **Security**: Safe for client-side, protected by RLS policies
- **Where to find**: Supabase Dashboard > Project Settings > API > anon public key

### SUPABASE_SERVICE_ROLE_KEY
- **Type**: Private (server-side only)
- **Description**: Supabase service role key
- **Security**: ⚠️ NEVER expose to client - bypasses RLS
- **Where to find**: Supabase Dashboard > Project Settings > API > service_role secret key

### STRIPE_SECRET_KEY
- **Type**: Private (server-side only)
- **Description**: Stripe secret key
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)
- **Security**: ⚠️ NEVER expose to client
- **Where to find**: Stripe Dashboard > Developers > API keys > Secret key

### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Type**: Public (exposed to browser)
- **Description**: Stripe publishable key
- **Format**: `pk_test_...` (test) or `pk_live_...` (production)
- **Security**: Safe for client-side
- **Where to find**: Stripe Dashboard > Developers > API keys > Publishable key

### NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
- **Type**: Public (exposed to browser)
- **Description**: Stripe Price ID for Starter Plan (£20 one-time)
- **Format**: `price_xxxxx`
- **How to create**: Stripe Dashboard > Products > Create product > Copy Price ID

### NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
- **Type**: Public (exposed to browser)
- **Description**: Stripe Price ID for Monthly Plan (£60/month)
- **Format**: `price_xxxxx`
- **How to create**: Stripe Dashboard > Products > Create product > Copy Price ID

### STRIPE_WEBHOOK_SECRET
- **Type**: Private (server-side only)
- **Description**: Webhook signing secret for verifying webhook events
- **Format**: `whsec_xxxxx`
- **Local**: Run `stripe listen --forward-to localhost:3000/api/webhook`
- **Production**: Stripe Dashboard > Developers > Webhooks > Signing secret

### AI_BACKEND_URL
- **Type**: Private (server-side only)
- **Description**: URL of AI backend service
- **Development**: `http://localhost:8000`
- **Production**: `https://your-ai-backend.com`
- **Note**: Different from `NEXT_PUBLIC_API_BASE_URL` (server-side only)

### AI_BACKEND_API_KEY
- **Type**: Private (server-side only)
- **Description**: API key for authenticating with AI backend
- **Required**: Only if backend requires API key authentication
- **Used by**: Server-side API routes when making backend requests

## Environment-Specific Values

### Development
- Use `http://localhost:3000` for `NEXT_PUBLIC_APP_URL`
- Use test Stripe keys (`sk_test_...`, `pk_test_...`)
- Use test Price IDs
- Use local backend URL if running locally

### Preview (Vercel)
- Use preview URL for `NEXT_PUBLIC_APP_URL` (auto-set by Vercel)
- Use test Stripe keys
- Use test Price IDs
- Use preview backend URL

### Production
- Use production domain for `NEXT_PUBLIC_APP_URL`
- Use live Stripe keys (`sk_live_...`, `pk_live_...`)
- Use production Price IDs
- Use production backend URL

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use different keys for each environment**
3. **Rotate keys regularly** - Especially if exposed
4. **Review `NEXT_PUBLIC_*` variables** - These are exposed to browser
5. **Never expose private keys** - `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`
6. **Use environment-specific values** - Don't mix production and test keys

## Vercel Configuration

### Setting Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable
3. Select environment(s): Production, Preview, Development
4. Save and redeploy

### Recommended Setup

- **Production**: All production values
- **Preview**: Test Stripe keys, preview URLs
- **Development**: Local values (optional, can use `.env.local`)

## Troubleshooting

### Variables Not Loading
- Ensure file is named `.env.local` (not `.env`)
- Restart development server after changes
- Check for typos in variable names
- Verify no extra spaces around `=` sign

### Client-Side Variables Not Available
- Ensure variable name starts with `NEXT_PUBLIC_`
- Restart development server
- Check browser console for errors
- Verify variable is set in Vercel (for production)

### Server-Side Variables Not Available
- Ensure variable is set in `.env.local` or Vercel
- Check variable name matches exactly (case-sensitive)
- Verify variable is not prefixed with `NEXT_PUBLIC_` (if server-only)
- Restart server after changes

## Example `.env.local`

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_51xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# AI Backend (Optional)
AI_BACKEND_URL=http://localhost:8000
AI_BACKEND_API_KEY=your_api_key_if_required
```

## Summary

- **Required**: Supabase and Stripe configuration
- **Optional**: AI Backend configuration
- **Security**: Never commit `.env.local`, use environment-specific keys
- **Vercel**: Set variables in dashboard for each environment
- **Testing**: Use test keys for development and preview
