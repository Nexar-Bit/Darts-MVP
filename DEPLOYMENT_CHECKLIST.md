# Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## Pre-Deployment

### Code Preparation
- [ ] All code committed to Git
- [ ] All tests passing locally
- [ ] No console errors or warnings
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] `.env.local` is NOT committed (check `.gitignore`)

### Environment Variables
- [ ] All required environment variables documented in `.env.example`
- [ ] Production environment variables prepared
- [ ] Test Stripe keys ready for preview deployments
- [ ] Production Stripe keys ready for production
- [ ] Supabase production project configured
- [ ] AI backend URL configured (if applicable)

### External Services Configuration
- [ ] Supabase project created and configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Stripe account configured
- [ ] Stripe products and prices created
- [ ] Stripe webhook endpoint configured
- [ ] AI backend deployed and accessible (if applicable)

## Vercel Deployment

### Project Setup
- [ ] GitHub repository created and code pushed
- [ ] Vercel account created and connected to GitHub
- [ ] Project imported from GitHub repository
- [ ] Framework auto-detected (Next.js)

### Environment Variables in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` set (will update after first deployment)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `STRIPE_SECRET_KEY` set (production keys for production, test for preview)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set
- [ ] `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` set
- [ ] `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` set
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] `NEXT_PUBLIC_API_BASE_URL` set (if using frontend API calls)
- [ ] `AI_BACKEND_URL` set (if applicable)
- [ ] `AI_BACKEND_API_KEY` set (if applicable)
- [ ] All variables set for correct environments (Production/Preview/Development)

### Build Configuration
- [ ] Build command: `npm run build` (default)
- [ ] Output directory: `.next` (default)
- [ ] Install command: `npm install` (default)
- [ ] Node.js version: 18.x or higher
- [ ] Function timeout configured in `vercel.json`

### First Deployment
- [ ] Initial deployment successful
- [ ] Build logs reviewed (no errors)
- [ ] Deployment URL obtained
- [ ] `NEXT_PUBLIC_APP_URL` updated with actual Vercel URL
- [ ] Redeployed after updating `NEXT_PUBLIC_APP_URL`

## Post-Deployment Configuration

### Supabase Configuration
- [ ] Site URL updated: `https://your-project.vercel.app`
- [ ] Redirect URLs added:
  - [ ] `https://your-project.vercel.app/auth/callback`
- [ ] Email templates configured (if using email auth)
- [ ] OAuth providers configured (if using)

### Stripe Configuration
- [ ] Webhook endpoint created: `https://your-project.vercel.app/api/webhook`
- [ ] Webhook events selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Webhook signing secret copied
- [ ] `STRIPE_WEBHOOK_SECRET` updated in Vercel
- [ ] Test webhook sent and verified
- [ ] Production Price IDs verified

### Domain Configuration (Optional)
- [ ] Custom domain added in Vercel
- [ ] DNS records configured
- [ ] SSL certificate issued (automatic with Vercel)
- [ ] Domain verified

## Testing

### Functional Testing
- [ ] Homepage loads correctly
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Password reset works (if implemented)
- [ ] Dashboard accessible after login
- [ ] Pricing page displays correctly
- [ ] Checkout flow works (test with Stripe test cards)
- [ ] Webhook receives events correctly
- [ ] Subscription status updates correctly
- [ ] Video upload works
- [ ] Analysis job creation works
- [ ] Job status polling works
- [ ] Results display correctly
- [ ] PDF download works
- [ ] Job history displays correctly

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Upload errors show user-friendly messages
- [ ] Job failures display error messages
- [ ] Retry mechanisms work
- [ ] Loading states display correctly
- [ ] Toast notifications appear

### Security Testing
- [ ] Unauthenticated users redirected to login
- [ ] Unpaid users redirected to pricing
- [ ] API routes require authentication
- [ ] CORS headers configured correctly
- [ ] Environment variables not exposed in client bundle
- [ ] HTTPS enforced (automatic with Vercel)

### Performance Testing
- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Large file uploads work
- [ ] Virtual scrolling works for large lists
- [ ] Images optimized
- [ ] No memory leaks

### Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Monitoring Setup

### Vercel Analytics
- [ ] Vercel Analytics enabled
- [ ] Performance metrics reviewed
- [ ] Function execution times monitored

### Error Tracking
- [ ] Error tracking service configured (Sentry, etc.)
- [ ] Error alerts configured
- [ ] Function logs monitored

### Uptime Monitoring
- [ ] Uptime monitoring service configured
- [ ] Alerts configured for downtime
- [ ] Health check endpoint tested (`/api/health`)

## Documentation

### Internal Documentation
- [ ] README.md updated with production URL
- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Troubleshooting guide updated

### User Documentation
- [ ] User guide created (if applicable)
- [ ] FAQ updated
- [ ] Support contact information added

## Launch Preparation

### Final Checks
- [ ] All checklist items completed
- [ ] Team notified of deployment
- [ ] Rollback plan prepared
- [ ] Support team briefed
- [ ] Monitoring dashboards ready

### Launch
- [ ] Production deployment verified
- [ ] Smoke tests passed
- [ ] Monitoring active
- [ ] Team on standby for issues

## Post-Launch

### Immediate (First 24 Hours)
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check webhook deliveries
- [ ] Verify payment processing
- [ ] Review user feedback
- [ ] Check function logs

### First Week
- [ ] Review analytics
- [ ] Monitor costs (Vercel, Stripe, Supabase)
- [ ] Collect user feedback
- [ ] Address any issues
- [ ] Optimize based on metrics

## Rollback Plan

If issues occur:
1. [ ] Identify the issue
2. [ ] Check Vercel deployment history
3. [ ] Revert to previous deployment if needed
4. [ ] Notify team
5. [ ] Document the issue
6. [ ] Fix and redeploy

## Success Criteria

Deployment is successful when:
- ✅ All functional tests pass
- ✅ No critical errors in logs
- ✅ Webhooks working correctly
- ✅ Payments processing correctly
- ✅ User authentication working
- ✅ Performance metrics acceptable
- ✅ No security issues detected

---

**Last Updated**: [Date]
**Deployed By**: [Name]
**Deployment URL**: [URL]
