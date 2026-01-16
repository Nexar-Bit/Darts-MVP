# Next Steps - Implementation Checklist

## 🎯 Immediate Actions Required

### 1. Run Database Migration ⚠️ **REQUIRED**

The `jobs` table needs to be created in your Supabase database.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20250120000003_create_jobs_table.sql`
5. Click **Run** (or press `Ctrl+Enter`)
6. Verify the table was created by checking **Table Editor** > `jobs`

**Option B: Using Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push
```

**Verify Migration:**
- Check that the `jobs` table exists in your Supabase database
- Verify RLS policies are enabled
- Confirm indexes are created

---

### 2. Configure Environment Variables ⚠️ **REQUIRED**

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your values:**
   - Open `.env.local` in your editor
   - Add your Supabase credentials
   - Add your Stripe credentials
   - Set `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000`)
   - Set `AI_BACKEND_URL` if you have a backend (optional for now)

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

**See [ENV_SETUP.md](./ENV_SETUP.md) for detailed instructions.**

---

### 3. Test the Implementation ✅

#### Test Upload Flow
1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** `http://localhost:3000/dashboard/analyze`

3. **Test upload:**
   - Upload a side-on video (or front-on, or both)
   - Verify file validation works (size, duration)
   - Check that job is created in database
   - Verify redirect to job detail page

4. **Test Job Detail Page:**
   - Verify polling mechanism works
   - Check progress bar updates
   - Verify status badges display correctly

#### Test Without Backend (Mock Mode)
- If `AI_BACKEND_URL` is not set, jobs will be created but won't process
- This is expected behavior - you can test the UI flow

#### Test With Backend (If Available)
- Set `AI_BACKEND_URL` in `.env.local`
- Upload a video
- Verify backend receives the request
- Check that job status updates correctly
- Verify results display when complete

---

### 4. Configure AI Backend (Optional)

If you have an AI backend service:

1. **Set environment variables:**
   ```env
   AI_BACKEND_URL=https://your-ai-backend.com
   AI_BACKEND_API_KEY=your_api_key_if_required
   ```

2. **Backend Requirements:**
   - Endpoint: `POST /analyze?model={model}`
   - Accepts: `side_video` and/or `front_video` files
   - Accepts: `user_id`, `job_id`, `model` parameters
   - Should update job status in Supabase `jobs` table:
     - Set `status` to `'running'` when processing starts
     - Update `progress` (0-1) during processing
     - Set `status` to `'done'` when complete
     - Store results in `result_data` JSONB field
     - Set URLs for overlay videos, PDFs, etc.

3. **Test Backend Integration:**
   - Upload a video
   - Verify backend receives the request
   - Check job status updates in Supabase
   - Verify results appear when processing completes

**See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for backend integration details.**

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Can access `/dashboard/analyze` page
- [ ] Can upload side-on video
- [ ] Can upload front-on video
- [ ] Can upload both videos
- [ ] File validation works (size, duration, type)
- [ ] Job is created in database
- [ ] Redirects to job detail page
- [ ] Job detail page loads correctly
- [ ] Polling mechanism works
- [ ] Status badges display correctly
- [ ] Progress bar updates

### With Backend (If Configured)
- [ ] Backend receives upload request
- [ ] Job status updates to 'running'
- [ ] Progress updates during processing
- [ ] Job status updates to 'done' when complete
- [ ] Results display correctly
- [ ] Overlay video plays
- [ ] PDF download works
- [ ] Practice plan displays
- [ ] Scorecard displays
- [ ] Lesson drills display

### Error Handling
- [ ] File too large shows error
- [ ] File too long shows error
- [ ] Invalid file type shows error
- [ ] Backend error shows error message
- [ ] Network error handled gracefully
- [ ] Usage limit enforced
- [ ] Authentication required

---

## 🚀 Deployment Preparation

### Pre-Deployment Checklist

1. **Database:**
   - [ ] All migrations run in production Supabase
   - [ ] RLS policies verified
   - [ ] Indexes created

2. **Environment Variables:**
   - [ ] All variables set in Vercel/hosting platform
   - [ ] Production Stripe keys configured
   - [ ] Production Supabase project configured
   - [ ] `NEXT_PUBLIC_APP_URL` set to production domain
   - [ ] `NEXT_PUBLIC_API_BASE_URL` set to production backend URL
   - [ ] `AI_BACKEND_URL` set if using backend

3. **Stripe:**
   - [ ] Production Price IDs configured
   - [ ] Webhook endpoint configured
   - [ ] Webhook signing secret added to environment variables
   - [ ] Webhook events selected:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. **Supabase:**
   - [ ] Production project created
   - [ ] Site URL set to production domain
   - [ ] Redirect URLs configured
   - [ ] Email templates configured (if using email auth)

5. **Build:**
   - [ ] `npm run build` succeeds
   - [ ] No TypeScript errors
   - [ ] No linting errors
   - [ ] All environment variables validated

---

## 📝 Common Issues & Solutions

### Issue: "Table 'jobs' does not exist"
**Solution:** Run the database migration (Step 1)

### Issue: "NEXT_PUBLIC_API_BASE_URL is not defined"
**Solution:** Add `NEXT_PUBLIC_API_BASE_URL` to `.env.local` and restart server

### Issue: Jobs created but not processing
**Solution:** 
- Check if `AI_BACKEND_URL` is set
- Verify backend is running and accessible
- Check backend logs for errors

### Issue: Polling not working
**Solution:**
- Check browser console for errors
- Verify authentication token is valid
- Check API route `/api/jobs/[jobId]` is accessible

### Issue: Overlay video not loading
**Solution:**
- Check `NEXT_PUBLIC_API_BASE_URL` is set correctly
- Verify video URL is absolute or relative to API base
- Check browser network tab for failed requests

---

## 🎓 Learning Resources

- **Environment Setup:** See [ENV_SETUP.md](./ENV_SETUP.md)
- **API Client Usage:** See [API_CLIENT_SETUP.md](./API_CLIENT_SETUP.md)
- **Implementation Details:** See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Frontend Analysis:** See [DARTS_FRONTEND_ANALYSIS.md](./DARTS_FRONTEND_ANALYSIS.md)

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review error messages in browser console
3. Check server logs
4. Verify environment variables are set correctly
5. Ensure database migrations are run

---

## ✅ Completion Criteria

You're ready to proceed when:
- ✅ Database migration is complete
- ✅ Environment variables are configured
- ✅ Basic upload flow works
- ✅ Job creation works
- ✅ Job detail page displays correctly
- ✅ (Optional) Backend integration works

Once these are complete, you can proceed with:
- Production deployment
- Backend integration (if not done)
- Customization and styling
- Additional features
