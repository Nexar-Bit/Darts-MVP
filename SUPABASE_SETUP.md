# Supabase Configuration for Production

## Issue: Email Verification Links Redirecting to localhost

When users click email verification links, they're being redirected to `localhost:3000` instead of your Vercel production URL.

## Solution: Update Supabase Dashboard Settings

### Step 1: Update Site URL in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL** to your Vercel production URL:
   ```
   https://your-app-name.vercel.app
   ```
   (Replace `your-app-name` with your actual Vercel app name)

### Step 2: Add Redirect URLs

In the same **URL Configuration** section, add these **Redirect URLs**:

```
https://your-app-name.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

This allows:
- Production redirects to work
- Local development to still work

### Step 3: Set Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update `NEXT_PUBLIC_APP_URL`:
   - **Name**: `NEXT_PUBLIC_APP_URL`
   - **Value**: `https://your-app-name.vercel.app`
   - **Environment**: Production (and Preview if needed)

### Step 4: Redeploy

After updating the environment variable in Vercel, trigger a new deployment:
- Either push a new commit, or
- Go to Vercel Dashboard → Your Project → Deployments → Click "Redeploy"

## How It Works

1. **Code Level**: The `signUp()` function sets `emailRedirectTo: ${appUrl}/auth/callback`
   - Uses `NEXT_PUBLIC_APP_URL` if set (production)
   - Falls back to `window.location.origin` (development)

2. **Supabase Level**: Supabase uses the **Site URL** from dashboard settings as the base for email links
   - This is why you MUST update the Site URL in the dashboard
   - The `emailRedirectTo` parameter is appended to the Site URL

## Testing

After configuration:
1. Sign up with a new email on your production site
2. Check the email - the verification link should point to your Vercel URL
3. Click the link - it should redirect to `/auth/callback` on your production site

## Troubleshooting

If links still point to localhost:
- ✅ Check Supabase Dashboard Site URL is set correctly
- ✅ Check `NEXT_PUBLIC_APP_URL` is set in Vercel
- ✅ Redeploy your Vercel app after setting environment variables
- ✅ Clear browser cache and try again
