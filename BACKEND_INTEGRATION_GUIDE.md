# Backend Integration Guide

This guide explains how to connect your existing AI backend to the Next.js application.

## 📋 Backend API Endpoints

Your backend implements these endpoints:

### 1. Upload Video(s)

**Endpoint:** `POST /upload`

**Purpose:** Upload video file(s) to the backend.

**Request Format:**
- Content-Type: `multipart/form-data`
- Method: `POST`

**Form Data Fields:**
- `side_video` (File, optional) - Side-on video file
- `front_video` (File, optional) - Front-on video file
- `user_id` (string, required) - User ID from Supabase
- `job_id` (string, required) - Job ID for tracking
- `user_email` (string, optional) - User email

**Expected Response:**
```json
{
  "job_id": "uuid-here",
  "status": "uploaded"
}
```

---

### 2. Start Analysis

**Endpoint:** `POST /analyze`

**Purpose:** Start video analysis (may accept videos directly or require upload first).

**Request Format:**
- Content-Type: `multipart/form-data` or `application/json`
- Method: `POST`

**If accepting videos directly:**
- Form Data: `side_video`, `front_video`, `user_id`, `job_id`, `model`

**If requiring upload first:**
- JSON Body: `{ "job_id": "...", "user_id": "...", "model": "..." }`

**Expected Response:**
```json
{
  "job_id": "uuid-here",
  "status": "running"
}
```

---

### 3. Poll Job Status

**Endpoint:** `GET /status/{job_id}`

**Purpose:** Check the status and progress of an analysis job.

**Request Format:**
- Method: `GET`
- Path Parameter: `job_id` (UUID)

**Expected Response (Processing):**
```json
{
  "job_id": "uuid-here",
  "status": "running",
  "progress": 0.5,
  "stage": "Processing video analysis..."
}
```

**Expected Response (Complete):**
```json
{
  "job_id": "uuid-here",
  "status": "done",
  "progress": 1.0,
  "result": {
    "overlay_url": "https://api.prodartscoach.com/results/{job_id}/overlay.mp4",
    "practice_plan_pdf_url": "https://api.prodartscoach.com/results/{job_id}/practice_plan.pdf",
    "throws_detected": 5,
    "scorecard": {...},
    "coaching_plan": {...},
    "lesson_plan": {...}
  }
}
```

---

### 4. Fetch Results

**Endpoint:** `GET /results/{job_id}/{resource}`

**Purpose:** Fetch specific result files (overlays, PDFs, etc.).

**Request Format:**
- Method: `GET`
- Path Parameters: `job_id` (UUID), `resource` (string)

**Example URLs:**
- `GET /results/{job_id}/overlay.mp4`
- `GET /results/{job_id}/practice_plan.pdf`

**Expected Response:**
- Content-Type: Depends on resource
- Body: Binary file content

---

## 🔗 Integration Steps

### Step 1: Update Environment Variables

Add to `.env.local`:

```env
# Backend API URL (production)
AI_BACKEND_URL=https://api.prodartscoach.com
NEXT_PUBLIC_API_BASE_URL=https://api.prodartscoach.com

# For local development, use your local backend URL
# AI_BACKEND_URL=http://localhost:8000
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Optional: API Key if backend requires it
AI_BACKEND_API_KEY=your-api-key-here
```

### Step 2: Update API Routes

The Next.js API routes need to call the correct backend endpoints:

1. **`/api/analyze`** - Should call backend `/upload` then `/analyze` (if two-step) or `/analyze` directly (if single-step)
2. **`/api/proxy/jobs/[jobId]`** - Should call backend `/status/{job_id}`

### Step 3: Update Result URLs

Result URLs should use the format:
- `https://api.prodartscoach.com/results/{job_id}/overlay.mp4`
- `https://api.prodartscoach.com/results/{job_id}/practice_plan.pdf`

---

## 📊 Workflow

### Two-Step Workflow (if backend requires separate upload)

1. Frontend → `/api/analyze` → Backend `/upload` → Backend `/analyze`
2. Frontend polls → `/api/jobs/{jobId}` → Backend `/status/{job_id}`
3. Frontend fetches → Backend `/results/{job_id}/overlay.mp4`

### Single-Step Workflow (if `/analyze` accepts videos directly)

1. Frontend → `/api/analyze` → Backend `/analyze` (with videos)
2. Frontend polls → `/api/jobs/{jobId}` → Backend `/status/{job_id}`
3. Frontend fetches → Backend `/results/{job_id}/overlay.mp4`

---

## 🔧 Code Updates Needed

### Update `/api/analyze/route.ts`

Currently calls: `POST ${aiBackendUrl}/analyze`

May need to update to:
- Option 1: Call `/upload` then `/analyze` (two-step)
- Option 2: Keep calling `/analyze` (single-step, if it accepts videos)

### Update `/api/proxy/jobs/[jobId]/route.ts`

Currently calls: `GET ${backendUrl}/jobs/${jobId}`

Should call: `GET ${backendUrl}/status/${jobId}`

### Update Result URL Construction

Currently uses: `overlay_url` from database

Should use: `https://api.prodartscoach.com/results/{job_id}/overlay.mp4`

---

## 🧪 Testing

### Test Backend Endpoints

```bash
# Test upload
curl -X POST https://api.prodartscoach.com/upload \
  -F "side_video=@test-video.mp4" \
  -F "user_id=test-user" \
  -F "job_id=test-job"

# Test analyze
curl -X POST https://api.prodartscoach.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"job_id":"test-job","user_id":"test-user","model":"gpt-5-mini"}'

# Test status
curl https://api.prodartscoach.com/status/test-job

# Test results
curl https://api.prodartscoach.com/results/test-job/overlay.mp4 -o overlay.mp4
```

---

## 📝 Notes

- The backend already exists and is deployed at `https://api.prodartscoach.com`
- The frontend needs to be updated to match the backend API structure
- See [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) for detailed API specification

---

**Next Steps:**
1. Verify backend endpoint behavior (single-step vs two-step)
2. Update Next.js API routes to match backend
3. Update result URL construction
4. Test end-to-end workflow

**Request Format:**
- Content-Type: `multipart/form-data`
- Method: `POST`
- Query Parameter: `model` (e.g., `gpt-5-mini`)

**Form Data Fields:**
- `side_video` (File, optional) - Side-on video file
- `front_video` (File, optional) - Front-on video file
- `video` (File, optional) - Legacy single video support
- `user_id` (string, required) - User ID from Supabase
- `job_id` (string, required) - Job ID for tracking
- `user_email` (string, optional) - User email
- `model` (string, optional) - AI model to use

**Request Headers:**
- `X-User-ID` (string) - User ID (also in form data)
- `X-API-Key` (string, optional) - API key if required
- `Authorization` (string, optional) - Bearer token

**Expected Response:**
```json
{
  "job_id": "uuid-here",
  "status": "running",
  "message": "Video analysis started"
}
```

**Status Code:** `200 OK`

---

### 2. Job Status Endpoint

**Endpoint:** `GET /jobs/{jobId}`

**Request Format:**
- Method: `GET`
- Path Parameter: `jobId` (UUID)

**Request Headers:**
- `X-User-ID` (string, optional) - User ID
- `X-API-Key` (string, optional) - API key if required
- `Authorization` (string, optional) - Bearer token

**Expected Response (Processing):**
```json
{
  "job_id": "uuid-here",
  "status": "running",
  "progress": 0.5,
  "stage": "Processing video analysis..."
}
```

**Expected Response (Complete):**
```json
{
  "job_id": "uuid-here",
  "status": "done",
  "progress": 1.0,
  "result": {
    "overlay_url": "https://example.com/videos/overlay.mp4",
    "overlay_side_url": "https://example.com/videos/overlay_side.mp4",
    "overlay_front_url": "https://example.com/videos/overlay_front.mp4",
    "practice_plan_pdf_url": "https://example.com/pdfs/practice_plan.pdf",
    "throws_detected": 5,
    "scorecard": {
      "overall_score": 7.5,
      "accuracy": 8.0,
      "consistency": 7.0,
      "technique": 7.5,
      "power": 8.5
    },
    "coaching_plan": {
      "focus_areas": ["...", "..."],
      "drills": [...]
    },
    "lesson_plan": {
      "title": "...",
      "lessons": [...]
    }
  }
}
```

**Expected Response (Failed):**
```json
{
  "job_id": "uuid-here",
  "status": "failed",
  "error": {
    "message": "Error description"
  }
}
```

**Expected Response (Not Found):**
```json
{
  "job_id": "uuid-here",
  "status": "not_found"
}
```

**Status Codes:**
- `200 OK` - Job found
- `404 Not Found` - Job doesn't exist

---

## 🔗 Integration Steps

### Step 1: Update Environment Variables

Add to `.env.local`:

```env
# AI Backend Configuration
AI_BACKEND_URL=https://your-ai-backend.com
AI_BACKEND_API_KEY=your_api_key_if_required

# Frontend API Base URL (for constructing result URLs)
NEXT_PUBLIC_API_BASE_URL=https://your-ai-backend.com
```

**Important:**
- `AI_BACKEND_URL` - Used by server-side API routes to proxy requests
- `NEXT_PUBLIC_API_BASE_URL` - Used by frontend to construct video/PDF URLs
- They can be the same URL or different (if using CDN for results)

### Step 2: Verify Backend Endpoints

Test your backend endpoints:

```bash
# Test analyze endpoint
curl -X POST https://your-ai-backend.com/analyze?model=gpt-5-mini \
  -F "side_video=@test-video.mp4" \
  -F "user_id=test-user" \
  -F "job_id=test-job" \
  -H "X-User-ID: test-user" \
  -H "X-API-Key: your-api-key"

# Test job status endpoint
curl https://your-ai-backend.com/jobs/test-job \
  -H "X-API-Key: your-api-key"
```

### Step 3: Update Supabase Jobs Table

Your backend should update the Supabase `jobs` table with results. The application expects these fields:

**Required Updates:**
- `status` - 'queued', 'running', 'done', or 'failed'
- `progress` - 0.0 to 1.0
- `stage` - Current processing stage (optional)
- `updated_at` - Timestamp

**When Job Completes:**
- `status` - 'done'
- `progress` - 1.0
- `overlay_url` - Overlay video URL
- `overlay_side_url` - Side overlay video URL (optional)
- `overlay_front_url` - Front overlay video URL (optional)
- `practice_plan_pdf_url` - PDF download URL
- `throws_detected` - Number of throws detected
- `result_data` - Full result JSON (jsonb)

**When Job Fails:**
- `status` - 'failed'
- `error_message` - Error description

### Step 4: Supabase Integration in Backend

Your backend needs Supabase credentials to update jobs:

```python
# Python example
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Update job status
supabase.table("jobs").update({
    "status": "running",
    "progress": 0.5,
    "stage": "Processing video analysis..."
}).eq("job_id", job_id).execute()

# Update job with results
supabase.table("jobs").update({
    "status": "done",
    "progress": 1.0,
    "overlay_url": result["overlay_url"],
    "practice_plan_pdf_url": result["practice_plan_pdf_url"],
    "throws_detected": result["throws_detected"],
    "result_data": result,
}).eq("job_id", job_id).execute()
```

```javascript
// Node.js example
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Update job status
await supabase
  .from('jobs')
  .update({
    status: 'running',
    progress: 0.5,
    stage: 'Processing video analysis...',
  })
  .eq('job_id', job_id);

// Update job with results
await supabase
  .from('jobs')
  .update({
    status: 'done',
    progress: 1.0,
    overlay_url: result.overlay_url,
    practice_plan_pdf_url: result.practice_plan_pdf_url,
    throws_detected: result.throws_detected,
    result_data: result,
  })
  .eq('job_id', job_id);
```

---

## 📊 Result Data Format

Your backend should return results in this format:

```json
{
  "overlay_url": "https://cdn.example.com/videos/{job_id}/overlay.mp4",
  "overlay_side_url": "https://cdn.example.com/videos/{job_id}/overlay_side.mp4",
  "overlay_front_url": "https://cdn.example.com/videos/{job_id}/overlay_front.mp4",
  "practice_plan_pdf_url": "https://cdn.example.com/pdfs/{job_id}/practice_plan.pdf",
  "throws_detected": 5,
  "scorecard": {
    "overall_score": 7.5,
    "accuracy": 8.0,
    "consistency": 7.0,
    "technique": 7.5,
    "power": 8.5,
    "release_timing": 7.0,
    "follow_through": 8.0
  },
  "coaching_plan": {
    "focus_areas": [
      "Improve release timing",
      "Strengthen follow-through"
    ],
    "drills": [
      {
        "name": "Release Timing Drill",
        "description": "Practice releasing at the peak of your throw",
        "reps": 20,
        "duration": "10 minutes"
      }
    ]
  },
  "lesson_plan": {
    "title": "Improve Your Throw Technique",
    "lessons": [
      {
        "title": "Release Timing",
        "description": "Learn when to release for maximum accuracy",
        "duration": "15 minutes"
      }
    ]
  }
}
```

**URL Requirements:**
- URLs can be absolute (`https://...`) or relative (`/videos/...`)
- If relative, `NEXT_PUBLIC_API_BASE_URL` will be prepended
- URLs should be publicly accessible
- Videos should be in MP4 format
- PDFs should be in PDF format

---

## 🔐 Authentication & Security

### API Key Authentication

If your backend requires API key authentication:

1. **Set in environment:**
   ```env
   AI_BACKEND_API_KEY=your-secret-api-key
   ```

2. **Backend receives it as:**
   - Header: `X-API-Key: your-secret-api-key`

### User Context

The application automatically includes:
- `user_id` in form data and `X-User-ID` header
- `job_id` in form data
- `user_email` in form data (optional)
- `Authorization: Bearer <token>` header (optional)

Your backend can use this for:
- User-specific processing
- Access control
- Logging and analytics

---

## 🔄 Processing Flow

### Expected Workflow

1. **Frontend uploads video** → `/api/analyze`
2. **Next.js API route:**
   - Validates authentication
   - Checks subscription
   - Creates job in Supabase
   - Forwards to your backend
3. **Your backend:**
   - Receives video and metadata
   - Updates job status to "running"
   - Processes video
   - Updates progress periodically
   - Updates job with results when complete
4. **Frontend polls status** → `/api/jobs/{jobId}`
5. **Next.js API route:**
   - Checks Supabase for latest status
   - Returns status to frontend
6. **Frontend displays results** when status is "done"

### Async Processing

Your backend should process videos asynchronously:
- Return `200 OK` immediately after accepting the video
- Process in background
- Update Supabase job status as progress is made
- Frontend will poll for updates automatically

---

## 🧪 Testing Integration

### Test 1: Health Check

```bash
curl https://your-ai-backend.com/health
```

### Test 2: Video Upload

```bash
curl -X POST https://your-ai-backend.com/analyze?model=gpt-5-mini \
  -F "side_video=@test-video.mp4" \
  -F "user_id=test-user-123" \
  -F "job_id=test-job-456" \
  -H "X-User-ID: test-user-123" \
  -H "X-API-Key: your-api-key"
```

Expected: `200 OK` with `{"job_id": "...", "status": "running"}`

### Test 3: Job Status

```bash
curl https://your-ai-backend.com/jobs/test-job-456 \
  -H "X-API-Key: your-api-key"
```

Expected: Job status with progress

### Test 4: Verify Supabase Updates

1. Upload a video through the frontend
2. Check Supabase Dashboard → `jobs` table
3. Verify job status updates:
   - `queued` → `running` → `done`
   - Progress updates (0.0 → 1.0)
   - Results populated when complete

---

## 🐛 Troubleshooting

### Backend Not Receiving Requests

**Check:**
- `AI_BACKEND_URL` is set correctly
- Backend is running and accessible
- CORS is configured (if different domain)
- Network/firewall allows connections

**Solution:**
- Test backend directly with curl
- Check Next.js server logs
- Verify environment variables

### Jobs Stay in "Queued" Status

**Cause:** Backend not processing jobs or not updating Supabase

**Solution:**
- Check backend logs for errors
- Verify Supabase credentials in backend
- Test Supabase connection from backend
- Verify job_id matches

### Results Not Displaying

**Cause:** Result format doesn't match expected structure

**Solution:**
- Verify `result_data` JSON structure
- Check URLs are accessible
- Verify `status` is "done" in database
- Check browser console for errors

### Progress Not Updating

**Cause:** Backend not updating progress in Supabase

**Solution:**
- Backend should update `progress` and `stage` fields
- Updates should happen every few seconds
- Verify Supabase updates are working

---

## 📝 Backend Implementation Checklist

- [ ] Implement `POST /analyze` endpoint
- [ ] Accept `multipart/form-data` with video files
- [ ] Accept `user_id` and `job_id` parameters
- [ ] Return `job_id` and `status` immediately
- [ ] Process videos asynchronously
- [ ] Update Supabase job status to "running"
- [ ] Update progress periodically (0.0 to 1.0)
- [ ] Update Supabase with results when complete
- [ ] Implement `GET /jobs/{jobId}` endpoint
- [ ] Return job status and results
- [ ] Handle error cases (failed, not_found)
- [ ] Support API key authentication (if required)
- [ ] Configure CORS (if different domain)
- [ ] Test with real video files
- [ ] Verify Supabase integration works

---

## 🔗 Quick Reference

### Environment Variables
```env
AI_BACKEND_URL=https://your-ai-backend.com
AI_BACKEND_API_KEY=your-api-key
NEXT_PUBLIC_API_BASE_URL=https://your-ai-backend.com
```

### Required Supabase Fields
- `jobs.status` - 'queued' | 'running' | 'done' | 'failed'
- `jobs.progress` - 0.0 to 1.0
- `jobs.overlay_url` - Video URL
- `jobs.practice_plan_pdf_url` - PDF URL
- `jobs.throws_detected` - Number of throws
- `jobs.result_data` - Full result JSON

### API Endpoints
- `POST /analyze?model={model}` - Upload and process video
- `GET /jobs/{jobId}` - Get job status and results

---

**Need help?** See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing instructions or [MOCK_BACKEND_GUIDE.md](./MOCK_BACKEND_GUIDE.md) for a working example.
