# Testing Guide

This guide explains how to test the video analysis dashboard functionality.

## 🧪 Testing Video Upload Functionality

### Prerequisites

Before testing, ensure you have:
- [ ] Supabase database set up (migrations run)
- [ ] User account created and logged in
- [ ] Subscription purchased (Starter or Monthly plan)
- [ ] Development server running (`npm run dev`)

### Step 1: Test Without Backend (UI Testing)

Even without an AI backend, you can test the full UI workflow:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the dashboard:**
   - Go to `http://localhost:3000/dashboard`
   - Or go to `http://localhost:3000/dashboard/analyze`

3. **Test video upload:**
   - Click "Choose file" or drag & drop a video file
   - Select a video file (MP4, MOV, AVI, or WebM)
   - File should appear in the upload area
   - Click "Start Analysis"

4. **What happens:**
   - ✅ Video uploads successfully
   - ✅ Job is created in database
   - ✅ Job appears in history with "queued" status
   - ✅ Progress indicator shows "Processing video analysis..."
   - ⚠️ Job stays in "queued" status (no backend to process it)

5. **Verify in database:**
   - Go to Supabase Dashboard → Table Editor → `jobs`
   - You should see a new job with:
     - `status: 'queued'`
     - `user_id: <your-user-id>`
     - `original_filename: <your-video-name>`

### Step 2: Test With Mock Backend

See [MOCK_BACKEND_GUIDE.md](./MOCK_BACKEND_GUIDE.md) for setting up a mock backend.

Once mock backend is running:
1. Set `AI_BACKEND_URL=http://localhost:8000` in `.env.local`
2. Restart the dev server
3. Upload a video
4. Watch the job progress: `queued` → `running` → `done`
5. Results should appear automatically

### Step 3: Test Error Scenarios

#### Test File Validation
- [ ] Try uploading a file that's too large (>400MB)
- [ ] Try uploading a non-video file
- [ ] Try uploading without selecting any file
- [ ] Verify error messages appear

#### Test Subscription Requirements
- [ ] Try uploading without a subscription (should redirect to pricing)
- [ ] Try uploading after reaching analysis limit
- [ ] Verify appropriate error messages

#### Test Network Errors
- [ ] Disconnect internet and try uploading
- [ ] Verify error handling and retry options
- [ ] Reconnect and verify retry works

### Step 4: Test Job History

1. **View job history:**
   - Go to dashboard
   - Scroll to "Analysis History" section
   - Should see all your jobs

2. **Test filtering:**
   - Filter by status (all, done, failed, running, queued)
   - Search by filename or job ID
   - Verify filters work correctly

3. **Test pagination:**
   - If you have many jobs, test pagination
   - Verify page navigation works

4. **Test job actions:**
   - Click on a job to view details
   - Test delete functionality
   - Verify refresh button works

### Step 5: Test Results Display

Once a job completes (with backend):

1. **View results:**
   - Click on a completed job
   - Should see:
     - Overlay video player
     - Scorecard with metrics
     - Coaching plan
     - PDF download button

2. **Test video player:**
   - Play/pause video
   - Test fullscreen
   - Test download

3. **Test PDF download:**
   - Click "Download PDF"
   - Verify download starts
   - Verify file opens correctly

## 🔍 Manual Testing Checklist

### Authentication Flow
- [ ] Sign up works
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect correctly
- [ ] Session persists across page refreshes

### Subscription Flow
- [ ] Pricing page displays correctly
- [ ] Checkout flow works
- [ ] Payment processing works
- [ ] Subscription status updates after payment
- [ ] Usage limits enforced correctly

### Video Upload Flow
- [ ] File selection works
- [ ] Drag & drop works
- [ ] File validation works
- [ ] Upload progress shows
- [ ] Job creation succeeds
- [ ] Error handling works

### Analysis Workflow
- [ ] Job status polling works
- [ ] Progress updates correctly
- [ ] Results display when complete
- [ ] Error states display correctly
- [ ] Retry mechanisms work

### Dashboard Features
- [ ] Job history displays
- [ ] Filtering works
- [ ] Search works
- [ ] Pagination works
- [ ] Refresh works
- [ ] Delete works

## 🧪 Automated Testing

### Run Linting
```bash
npm run lint
```

### Run Build
```bash
npm run build
```

### Test API Endpoints

#### Test Health Check
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

#### Test Analyze Endpoint (with authentication)
```bash
# Get your auth token from browser DevTools → Application → Local Storage
TOKEN="your-auth-token-here"

curl -X POST http://localhost:3000/api/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "side_video=@path/to/video.mp4" \
  -F "model=gpt-5-mini"
```

Expected response:
```json
{
  "job_id": "uuid-here"
}
```

#### Test Jobs Endpoint
```bash
curl -X GET http://localhost:3000/api/jobs?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "user_id": "user-uuid",
  "count": 1,
  "jobs": [...]
}
```

## 🐛 Debugging Tips

### Check Browser Console
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### Check Server Logs
- Check terminal where `npm run dev` is running
- Look for error messages
- Check API route logs

### Check Database
- Go to Supabase Dashboard
- Check `jobs` table for created jobs
- Check `profiles` table for user data
- Verify RLS policies are working

### Check Environment Variables
- Verify `.env.local` has all required variables
- Check that `NEXT_PUBLIC_API_BASE_URL` is set (if using backend)
- Verify `AI_BACKEND_URL` is set (if using backend)

## 📊 Test Data

### Sample Video Files for Testing

You can use any video file for testing:
- MP4 format recommended
- Keep files under 400MB
- Keep duration under 70 seconds
- Use test videos (not real user data)

### Test User Accounts

Create test accounts with:
- Different subscription plans (Starter, Monthly)
- Different usage levels (0, 1, 2, 3+ analyses)
- Test edge cases (limit reached, expired subscriptions)

## ✅ Success Criteria

A successful test should show:
- ✅ Video uploads without errors
- ✅ Job appears in database
- ✅ Job status updates correctly
- ✅ Results display when complete
- ✅ No console errors
- ✅ No network errors
- ✅ UI is responsive and works correctly

---

**Next Steps:**
- Set up mock backend for full testing: [MOCK_BACKEND_GUIDE.md](./MOCK_BACKEND_GUIDE.md)
- Connect real backend: [BACKEND_INTEGRATION_GUIDE.md](./BACKEND_INTEGRATION_GUIDE.md)
