# Environment Configuration Guide

## Overview

This guide explains how to configure environment variables for the Dart Throw Analysis Platform.

## Quick Start

1. **Copy the example file**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your values**
   - Open `.env.local` in your editor
   - Replace placeholder values with your actual credentials

3. **Restart your development server**
   ```bash
   npm run dev
   ```

## Environment Variables

### Application Configuration

#### `NEXT_PUBLIC_APP_URL`
- **Description**: The base URL of your application
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`
- **Required**: Yes
- **Used by**: Stripe redirects, email links, OAuth callbacks

#### `NEXT_PUBLIC_API_BASE_URL`
- **Description**: Base URL for the AI backend API
- **Development**: `http://localhost:8000`
- **Production**: `https://your-ai-backend.com`
- **Required**: Yes (for frontend API calls)
- **Used by**: Frontend components to construct API URLs
- **Note**: This is different from `AI_BACKEND_URL` which is server-side only

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Description**: Your Supabase project URL
- **Format**: `https://xxxxx.supabase.co`
- **Where to find**: Supabase Dashboard > Project Settings > API > Project URL
- **Required**: Yes

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Description**: Supabase anonymous/public key (safe for client-side)
- **Where to find**: Supabase Dashboard > Project Settings > API > Project API keys > `anon` `public`
- **Required**: Yes
- **Security**: This key is exposed to the browser but protected by RLS policies

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Description**: Supabase service role key (server-side only)
- **Where to find**: Supabase Dashboard > Project Settings > API > Project API keys > `service_role` `secret`
- **Required**: Yes
- **Security**: ⚠️ **NEVER** expose this key to the client. It bypasses RLS policies.

### Stripe Configuration

#### `STRIPE_SECRET_KEY`
- **Description**: Stripe secret key (server-side only)
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)
- **Where to find**: Stripe Dashboard > Developers > API keys > Secret key
- **Required**: Yes
- **Security**: ⚠️ **NEVER** expose this key to the client

#### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Description**: Stripe publishable key (safe for client-side)
- **Format**: `pk_test_...` (test) or `pk_live_...` (production)
- **Where to find**: Stripe Dashboard > Developers > API keys > Publishable key
- **Required**: Yes

#### `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
- **Description**: Stripe Price ID for the Starter Plan (£20 one-time)
- **Format**: `price_xxxxx`
- **How to create**: 
  1. Stripe Dashboard > Products > Create product
  2. Name: "Starter Plan"
  3. Price: £20, One-time payment
  4. Copy the Price ID
- **Required**: Yes

#### `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
- **Description**: Stripe Price ID for the Monthly Plan (£60/month subscription)
- **Format**: `price_xxxxx`
- **How to create**: 
  1. Stripe Dashboard > Products > Create product
  2. Name: "Monthly Plan"
  3. Price: £60, Recurring monthly
  4. Copy the Price ID
- **Required**: Yes

#### `STRIPE_WEBHOOK_SECRET`
- **Description**: Webhook signing secret for verifying webhook events
- **Format**: `whsec_xxxxx`
- **How to get**:
  - **Local**: Run `stripe listen --forward-to localhost:3000/api/webhook` and copy the secret
  - **Production**: Stripe Dashboard > Developers > Webhooks > Your endpoint > Signing secret
- **Required**: Yes (for webhook verification)

### AI Backend Configuration (Optional)

#### `AI_BACKEND_URL`
- **Description**: URL of your AI backend service (server-side only)
- **Development**: `http://localhost:8000`
- **Production**: `https://your-ai-backend.com`
- **Required**: No (app will create jobs but won't process them until configured)
- **Used by**: Server-side API routes to proxy analysis requests
- **Note**: This is different from `NEXT_PUBLIC_API_BASE_URL` which is for frontend

#### `AI_BACKEND_API_KEY`
- **Description**: API key for authenticating with AI backend (if required)
- **Required**: No (only if your backend requires API key authentication)
- **Used by**: Server-side API routes when making requests to backend

## Environment Variable Differences

### `NEXT_PUBLIC_API_BASE_URL` vs `AI_BACKEND_URL`

- **`NEXT_PUBLIC_API_BASE_URL`**: 
  - Exposed to the browser (client-side)
  - Used by frontend components to construct URLs
  - Example: Building overlay video URLs, PDF download links

- **`AI_BACKEND_URL`**:
  - Server-side only (not exposed to browser)
  - Used by API routes to proxy requests to backend
  - Falls back to `NEXT_PUBLIC_AI_BACKEND_URL` if not set
  - Used for actual video processing

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use different keys for development and production**
3. **Rotate keys regularly** - Especially if exposed
4. **Use environment-specific values** - Don't use production keys in development
5. **Review `NEXT_PUBLIC_*` variables** - These are exposed to the browser

## Production Deployment

### Vercel

1. Go to Project Settings > Environment Variables
2. Add all variables from `.env.example`
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain
4. Use production Stripe keys (`sk_live_...`, `pk_live_...`)
5. Use production Supabase project
6. Set `AI_BACKEND_URL` to your production backend

### Other Platforms

- Ensure all environment variables are set
- Use production credentials
- Update `NEXT_PUBLIC_APP_URL` to your domain
- Configure webhooks with your production URL

## Troubleshooting

### "API_BASE_URL is not defined"
- Ensure `NEXT_PUBLIC_API_BASE_URL` is set in `.env.local`
- Restart your development server after adding variables
- Check that variable name starts with `NEXT_PUBLIC_` for client-side access

### "AI_BACKEND_URL not configured"
- This is a warning, not an error
- Jobs will be created but won't process until backend is configured
- Set `AI_BACKEND_URL` in `.env.local` to enable processing

### Environment variables not loading
- Ensure file is named `.env.local` (not `.env`)
- Restart development server after changes
- Check for typos in variable names
- Verify no extra spaces around `=` sign

## Example `.env.local`

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_test_51xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# AI Backend (Optional)
AI_BACKEND_URL=http://localhost:8000
AI_BACKEND_API_KEY=your_api_key_if_required
```

## API Client Usage

The API client is configured in `lib/api/client.ts` and can be used throughout the application:

```typescript
import { apiClient, absUrl, getApiBaseUrl } from '@/lib/api';

// Get base URL
const baseUrl = getApiBaseUrl();

// Convert relative URL to absolute
const videoUrl = absUrl('/videos/overlay.mp4');

// Make API requests
const jobs = await apiClient.get('/jobs');
const result = await apiClient.post('/analyze', formData);
```
