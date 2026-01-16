# Preview Environment Testing Guide

This guide explains how to test your application in Vercel preview deployments before merging to production.

## Overview

Vercel automatically creates preview deployments for every pull request. These preview deployments allow you to test changes in a production-like environment before merging to the main branch.

## How Preview Deployments Work

1. **Create a Pull Request**
   - Push your branch to GitHub
   - Create a PR from your branch to `main`
   - Vercel automatically detects the PR

2. **Preview Deployment Created**
   - Vercel builds and deploys your branch
   - Unique preview URL generated
   - URL shared in PR comments

3. **Test Your Changes**
   - Use the preview URL to test
   - Share URL with team for review
   - Fix issues and push updates (auto-redeploys)

4. **Merge to Production**
   - Once tests pass, merge PR
   - Production deployment triggers automatically

## Preview URL Format

```
https://your-project-git-branch-username.vercel.app
```

Example:
```
https://dart-analysis-git-feature-new-ui-johndoe.vercel.app
```

## Environment Variables

### Setting Preview Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add variables with **Preview** environment selected
3. Use test credentials for preview:
   - Test Stripe keys (`sk_test_...`, `pk_test_...`)
   - Test Supabase project (optional)
   - Preview AI backend URL (if applicable)

### Recommended Preview Variables

```env
# Use test Stripe keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Use test Price IDs
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_test_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_test_...

# Preview webhook secret (from Stripe CLI or test webhook)
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Preview app URL (will be auto-set by Vercel)
NEXT_PUBLIC_APP_URL=https://your-project-git-branch.vercel.app
```

## Testing Checklist

### Basic Functionality
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] No console errors
- [ ] No build errors
- [ ] All pages accessible

### Authentication
- [ ] Sign up works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works (if implemented)
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect correctly

### Dashboard
- [ ] Dashboard loads after login
- [ ] User profile displays correctly
- [ ] Subscription status shows correctly
- [ ] Navigation works

### Payments (Test Mode)
- [ ] Pricing page displays
- [ ] Checkout button works
- [ ] Stripe Checkout opens
- [ ] Test card payment succeeds
  - Use: `4242 4242 4242 4242`
  - Any future expiry date
  - Any CVC
- [ ] Redirect after payment works
- [ ] Subscription status updates
- [ ] Customer portal accessible

### Video Analysis
- [ ] Upload form displays
- [ ] File selection works
- [ ] File validation works
- [ ] Upload starts successfully
- [ ] Progress indicator shows
- [ ] Job creation succeeds
- [ ] Status polling works
- [ ] Results display correctly
- [ ] PDF download works

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Upload errors show messages
- [ ] Job failures display errors
- [ ] Retry mechanisms work
- [ ] Loading states display

### Performance
- [ ] Page load times acceptable
- [ ] API responses timely
- [ ] Large file uploads work
- [ ] Virtual scrolling works
- [ ] No memory leaks

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

## Testing Stripe Webhooks in Preview

### Option 1: Stripe CLI (Recommended)

1. **Install Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Preview URL**
   ```bash
   stripe listen --forward-to https://your-preview-url.vercel.app/api/webhook
   ```

4. **Copy Webhook Secret**
   - Secret displayed in terminal (starts with `whsec_`)
   - Add to Vercel Preview environment variables

5. **Trigger Test Events**
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.created
   ```

### Option 2: Stripe Dashboard

1. **Create Test Webhook**
   - Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-preview-url.vercel.app/api/webhook`
   - Select test events
   - Copy signing secret

2. **Add to Vercel**
   - Add `STRIPE_WEBHOOK_SECRET` to Preview environment
   - Redeploy preview

3. **Send Test Webhook**
   - Stripe Dashboard → Webhooks → Your endpoint
   - Click "Send test webhook"
   - Select event type
   - Check Vercel function logs

## Common Preview Issues

### Issue: Environment Variables Not Loading

**Symptoms:**
- API calls fail
- Missing configuration errors

**Solutions:**
1. Verify variables set for Preview environment
2. Check variable names (case-sensitive)
3. Redeploy after adding variables
4. Check Vercel deployment logs

### Issue: Stripe Webhook Not Working

**Symptoms:**
- Payment succeeds but subscription not updated
- Webhook events not received

**Solutions:**
1. Verify webhook URL is correct
2. Check webhook secret matches
3. Verify webhook endpoint is accessible
4. Check Vercel function logs
5. Test with Stripe CLI

### Issue: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- API requests blocked

**Solutions:**
1. Check `vercel.json` CORS headers
2. Verify API route CORS configuration
3. Check preview URL matches allowed origins

### Issue: Build Fails

**Symptoms:**
- Preview deployment fails
- Build errors in logs

**Solutions:**
1. Check build logs in Vercel Dashboard
2. Fix TypeScript errors
3. Fix linting errors
4. Check for missing dependencies
5. Verify Node.js version

### Issue: Slow Performance

**Symptoms:**
- Slow page loads
- Slow API responses

**Solutions:**
1. Preview deployments may have cold starts
2. Check function execution times
3. Review performance metrics
4. Optimize code if needed

## Best Practices

### Before Creating PR
- [ ] Test locally first
- [ ] Fix all linting errors
- [ ] Fix all TypeScript errors
- [ ] Run build locally (`npm run build`)
- [ ] Test critical paths locally

### During Preview Testing
- [ ] Test all new features
- [ ] Test existing features (regression)
- [ ] Test error scenarios
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Share preview URL with team

### Before Merging
- [ ] All tests pass
- [ ] No console errors
- [ ] No build errors
- [ ] Team review completed
- [ ] Preview environment variables set
- [ ] Documentation updated

## Preview vs Production

### Differences
- **Preview**: Test credentials, unique URL, auto-deploys on push
- **Production**: Live credentials, main domain, deploys on merge

### Same
- Same codebase
- Same build process
- Same infrastructure
- Same performance characteristics (mostly)

## Monitoring Preview Deployments

### Vercel Dashboard
- View deployment status
- Check build logs
- Monitor function logs
- Review performance metrics

### Function Logs
1. Go to Vercel Dashboard → Your Project
2. Click on preview deployment
3. Click "Function Logs"
4. Monitor for errors

### Analytics
- Preview deployments have limited analytics
- Use for debugging, not metrics
- Production analytics are more accurate

## Cleanup

### Automatic Cleanup
- Preview deployments auto-delete after PR is closed/merged
- Old preview URLs become invalid
- No manual cleanup needed

### Manual Cleanup
- If needed, delete preview deployments in Vercel Dashboard
- Usually not necessary

## Summary

Preview deployments are essential for:
- ✅ Testing changes before production
- ✅ Sharing work with team
- ✅ Catching issues early
- ✅ Building confidence before merge

Always test thoroughly in preview before merging to production!
