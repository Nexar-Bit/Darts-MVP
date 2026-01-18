# Live API Setup - api.prodartscoach.com

## ✅ Configuration Status

Your API is now live at `https://api.prodartscoach.com` (deployed via Docker).

## 🔧 Environment Variables

Make sure your `.env.local` has:

```env
# Backend API URL (server-side)
AI_BACKEND_URL=https://api.prodartscoach.com

# Backend API URL (client-side accessible)
NEXT_PUBLIC_AI_BACKEND_URL=https://api.prodartscoach.com

# OR use this (already set in your .env.local)
NEXT_PUBLIC_API_BASE_URL=https://api.prodartscoach.com
```

**Note:** The code will automatically use `NEXT_PUBLIC_API_BASE_URL` if `AI_BACKEND_URL` is not set, so your current configuration should work.

## 🚀 How It Works Now

### Direct Upload Flow (Bypasses Vercel 4.5MB Limit)

1. **Create Job** → `/api/analyze/create-job`
   - Creates job in Supabase
   - Validates permissions
   - Returns `job_id` and backend URLs

2. **Upload Videos** → `https://api.prodartscoach.com/upload`
   - Files uploaded directly from browser to your backend
   - No size limit (bypasses Vercel)
   - Includes: `side_video`, `front_video`, `user_id`, `job_id`, `model`

3. **Start Analysis** → `https://api.prodartscoach.com/analyze`
   - Starts analysis processing
   - Sends: `job_id`, `user_id`, `model`

4. **Poll Status** → `/api/jobs/{jobId}` → Supabase
   - Frontend polls job status
   - Updates when analysis completes

## 🧪 Testing the Live API

### Test Upload (Direct)
```bash
curl -X POST https://api.prodartscoach.com/upload \
  -F "side_video=@test-video.mp4" \
  -F "user_id=test-user-id" \
  -F "job_id=test-job-id" \
  -H "X-User-ID: test-user-id"
```

### Test Analyze
```bash
curl -X POST https://api.prodartscoach.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"job_id":"test-job-id","user_id":"test-user-id","model":"gpt-5-mini"}'
```

### Test Status
```bash
curl https://api.prodartscoach.com/status/test-job-id \
  -H "X-User-ID: test-user-id"
```

## ✅ What's Configured

- ✅ Direct upload to backend (bypasses Vercel limits)
- ✅ Automatic HTTPS URL handling
- ✅ Fallback to `NEXT_PUBLIC_API_BASE_URL` if needed
- ✅ Job creation and permission validation
- ✅ Two-step workflow (upload → analyze)

## 🔍 Verification Checklist

- [ ] `NEXT_PUBLIC_API_BASE_URL=https://api.prodartscoach.com` is set
- [ ] Backend API is accessible at `https://api.prodartscoach.com`
- [ ] Backend accepts uploads at `/upload` endpoint
- [ ] Backend accepts analysis requests at `/analyze` endpoint
- [ ] Backend returns status at `/status/{job_id}` endpoint
- [ ] CORS is configured on backend to allow frontend domain

## 🐛 Troubleshooting

### If uploads fail:
1. Check browser console for CORS errors
2. Verify backend is accessible: `curl https://api.prodartscoach.com/health`
3. Check backend logs for errors
4. Verify environment variables are set correctly

### If analysis doesn't start:
1. Check that `/analyze` endpoint is called after upload
2. Verify `job_id` is passed correctly
3. Check backend logs for analysis start errors

### If results don't appear:
1. Verify backend updates job status in Supabase
2. Check that `/status/{job_id}` returns correct status
3. Verify result URLs are in correct format: `/results/{job_id}/overlay.mp4`

## 📝 Next Steps

1. **Test the upload flow** - Upload a video and verify it reaches your backend
2. **Monitor backend logs** - Check Docker logs to see requests coming through
3. **Verify CORS** - Ensure backend allows requests from your frontend domain
4. **Test end-to-end** - Complete a full analysis cycle

## 🔐 Security Notes

- Backend should validate `X-User-ID` header
- Consider adding API key authentication if needed
- Ensure backend validates `job_id` belongs to `user_id`
- Use HTTPS for all API calls (already configured)
