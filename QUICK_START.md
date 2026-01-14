# Quick Start Guide

## 🚀 Deploy in 5 Minutes

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Add environment variables (see below)
5. Click "Deploy"

### 3. Add Environment Variables in Vercel

Copy these from your `.env.local`:

**Required:**
- `NEXT_PUBLIC_APP_URL` (set to your Vercel URL after first deploy)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

**Optional:**
- `AI_BACKEND_URL`
- `AI_BACKEND_API_KEY`

### 4. Update External Services

**Supabase:**
- Authentication → URL Configuration
- Add Vercel URL to Site URL and Redirect URLs

**Stripe:**
- Developers → Webhooks
- Add endpoint: `https://your-project.vercel.app/api/webhook`
- Copy signing secret to Vercel env vars

### 5. Redeploy

After updating environment variables, redeploy or wait for auto-redeploy.

## ✅ Done!

Your app is live at: `https://your-project.vercel.app`

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
