# Deployment Guide

This guide walks you through deploying the Dart Throw Analysis Platform to Vercel.

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ All code committed to Git
- ✅ GitHub account and repository created
- ✅ Vercel account (free tier works)
- ✅ Supabase project configured
- ✅ Stripe account configured
- ✅ All environment variables ready

## 🔧 Step 1: GitHub Repository Setup

### 1.1 Initialize Git Repository (if not already done)

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Dart Throw Analysis Platform"

# Add remote repository (replace with your repository URL)
git remote add origin https://github.com/yourusername/your-repo-name.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 1.2 Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon in the top right → **New repository**
3. Fill in repository details:
   - **Repository name**: `dart-throw-analysis` (or your preferred name)
   - **Description**: "AI-powered dart throwing analysis platform"
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **Create repository**
5. Follow the instructions shown to push your existing code

### 1.3 Verify Repository

- Ensure `.env.local` is **NOT** committed (check `.gitignore`)
- Verify all necessary files are committed
- Check that sensitive files are excluded

## 🚀 Step 2: Vercel Deployment

### 2.1 Connect Repository to Vercel

1. Go to [Vercel](https://vercel.com) and sign in (use GitHub to sign in)
2. Click **Add New Project**
3. Import your GitHub repository:
   - Select your repository from the list
   - Click **Import**

### 2.2 Configure Project Settings

Vercel will auto-detect Next.js. Configure:

**Framework Preset**: Next.js (auto-detected)
**Root Directory**: `./` (default)
**Build Command**: `npm run build` (default)
**Output Directory**: `.next` (default)
**Install Command**: `npm install` (default)

### 2.3 Add Environment Variables

Before deploying, add all environment variables:

1. In the **Environment Variables** section, add each variable:

#### Required Variables:

```env
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_your_starter_price_id
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Optional Variables:

```env
AI_BACKEND_URL=https://your-ai-backend.com
AI_BACKEND_API_KEY=your_api_key
```

**Important Notes:**
- Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (you'll get this after first deployment)
- Use **production** Stripe keys (`sk_live_` and `pk_live_`) for production
- Use **test** Stripe keys (`sk_test_` and `pk_test_`) for preview deployments
- You can set different values for Production, Preview, and Development environments

### 2.4 Deploy

1. Click **Deploy**
2. Wait for the build to complete (usually 2-3 minutes)
3. Once deployed, you'll get a URL like: `https://your-project.vercel.app`

### 2.5 Update Environment Variables

After first deployment:

1. Go to **Project Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
3. Redeploy (or wait for automatic redeploy)

## 🔗 Step 3: Configure External Services

### 3.1 Update Supabase Settings

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update:
   - **Site URL**: `https://your-project.vercel.app`
   - **Redirect URLs**: Add `https://your-project.vercel.app/auth/callback`
5. Save changes

### 3.2 Update Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint** (or edit existing)
4. Set **Endpoint URL**: `https://your-project.vercel.app/api/webhook`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
9. Redeploy your Vercel project

### 3.3 Update Stripe Price IDs

If you're using production Stripe:
1. Create products in Stripe Dashboard
2. Get the production Price IDs
3. Update `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` and `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` in Vercel

### 3.4 Enable Payment Methods (Apple Pay & PayPal)

1. **Enable PayPal**:
   - Go to Stripe Dashboard > Settings > Payment methods
   - Enable PayPal
   - Complete any required PayPal account setup
   - PayPal will appear as an option in checkout (explicitly enabled in code)

2. **Enable Apple Pay**:
   - Go to Stripe Dashboard > Settings > Payment methods
   - Enable Apple Pay
   - For production: Verify your domain in Stripe Dashboard
   - Apple Pay will automatically appear in checkout on supported devices (Safari on iOS/macOS, Chrome on iOS)
   - **Note**: Apple Pay is handled automatically by Stripe - it doesn't need to be in `payment_method_types`

**Note**: PayPal is explicitly configured in the code. Apple Pay is automatically handled by Stripe when enabled in the dashboard.

## ✅ Step 4: Verify Deployment

### 4.1 Test in Preview Environment

Before deploying to production, test in preview:

1. **Create a Pull Request**
   ```bash
   git checkout -b test-preview
   git push origin test-preview
   ```

2. **Vercel creates preview deployment**
   - Preview URL shared in PR comments
   - Use test Stripe keys for preview
   - Test all features in preview environment

3. **Preview Testing Checklist**
   - [ ] Homepage loads
   - [ ] Sign up/login works
   - [ ] Dashboard accessible
   - [ ] Pricing page displays
   - [ ] Checkout flow works (test cards)
   - [ ] Video upload works
   - [ ] Analysis job creation works
   - [ ] Results display correctly
   - [ ] No console errors
   - [ ] No build errors

4. **Merge to Production**
   - Once preview tests pass, merge PR
   - Production deployment triggers automatically

### 4.2 Test the Application (Production)

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Test signup/login flow
3. Test pricing page
4. Test checkout flow (use Stripe test cards)
5. Test webhook (trigger a test event from Stripe Dashboard)
6. Test video upload and analysis
7. Verify subscription status updates

### 4.2 Check Logs

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on a deployment → **View Function Logs**
3. Check for any errors

### 4.3 Test Webhook

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select `checkout.session.completed`
5. Check Vercel function logs to verify it was received

## 🔄 Step 5: Continuous Deployment

Vercel automatically deploys on every push to your main branch:

1. Make changes locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. Vercel will automatically:
   - Detect the push
   - Build the project
   - Deploy to production

### Preview Deployments

- Every pull request gets a preview deployment
- Preview URLs are shared automatically in PR comments
- Use test Stripe keys for preview deployments

#### Testing Preview Deployments

1. **Environment Variables**
   - Preview deployments use Preview environment variables
   - Set test Stripe keys for Preview environment
   - Use test Supabase project (optional)

2. **Testing Checklist**
   - [ ] All features work in preview
   - [ ] No console errors
   - [ ] API routes respond correctly
   - [ ] Authentication works
   - [ ] Payments work (test mode)
   - [ ] Webhooks work (if configured)

3. **Preview URL Format**
   - `https://your-project-git-branch-username.vercel.app`
   - Each PR gets unique URL
   - URL persists until PR is closed/merged

4. **Preview Limitations**
   - Preview deployments may have slower cold starts
   - Some features may require production environment
   - Test thoroughly before merging to production

## 🛠️ Troubleshooting

### Build Fails

1. Check build logs in Vercel Dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies
   - Build timeout (increase in `vercel.json`)

### Environment Variables Not Working

1. Ensure variables are set for the correct environment (Production/Preview/Development)
2. Redeploy after adding variables
3. Check variable names match exactly (case-sensitive)
4. Verify `NEXT_PUBLIC_*` prefix for client-side variables

### Webhook Not Working

1. Verify webhook URL is correct
2. Check webhook signing secret matches
3. Check Vercel function logs
4. Test webhook from Stripe Dashboard
5. Ensure webhook endpoint has correct timeout (set in `vercel.json`)

### Authentication Issues

1. Check Supabase URL and keys
2. Verify redirect URLs in Supabase settings
3. Check `NEXT_PUBLIC_APP_URL` matches your Vercel URL
4. Review Supabase logs

### Payment Issues

1. Verify Stripe API keys are correct
2. Check Price IDs match your Stripe products
3. Ensure webhook is configured correctly
4. Test with Stripe test cards first

## 📊 Monitoring

### Vercel Analytics

1. Enable Vercel Analytics in project settings
2. View performance metrics
3. Monitor function execution times

### Function Logs

1. Go to **Deployments** → Select deployment → **Function Logs**
2. Monitor API route performance
3. Check for errors

### Stripe Dashboard

1. Monitor webhook deliveries
2. Check payment success rates
3. Review customer subscriptions

## 🔐 Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] `.env.local` not committed to Git
- [ ] Production Stripe keys used (not test keys)
- [ ] Webhook signing secret configured
- [ ] Supabase service role key secured
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] CORS configured correctly

## 📝 Next Steps After Deployment

1. **Set up custom domain** (optional)
   - Go to Vercel Project Settings → Domains
   - Add your custom domain
   - Update DNS records

2. **Configure monitoring**
   - Set up error tracking (Sentry, etc.)
   - Configure uptime monitoring
   - Set up alerts

3. **Enable analytics**
   - Google Analytics
   - Vercel Analytics
   - Custom analytics

4. **Production testing**
   - Test full user flow
   - Test payment processing
   - Test webhook delivery
   - Load testing

5. **Documentation**
   - Update README with production URL
   - Document API endpoints
   - Create user guide

## 🆘 Getting Help

If you encounter issues:

1. Check Vercel documentation: https://vercel.com/docs
2. Check Next.js documentation: https://nextjs.org/docs
3. Review function logs in Vercel Dashboard
4. Check Stripe webhook logs
5. Review Supabase logs

## 🎉 Success!

Once deployed, your application will be live at:
`https://your-project.vercel.app`

Share this URL with your team and start testing!
