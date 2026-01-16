# Backend API Specification

This document describes the actual backend API endpoints that the frontend integrates with.

## 🌐 Backend URLs

- **Local Development**: (configure in `.env.local`)
- **Production**: `https://api.prodartscoach.com`

## 📋 API Endpoints

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

**Request Headers:**
- `X-User-ID` (string) - User ID (also in form data)
- `X-API-Key` (string, optional) - API key if required
- `Authorization` (string, optional) - Bearer token

**Expected Response:**
```json
{
  "job_id": "uuid-here",
  "status": "uploaded",
  "message": "Videos uploaded successfully"
}
```

**Status Code:** `200 OK`

---

### 2. Start Analysis

**Endpoint:** `POST /analyze`

**Purpose:** Start video analysis after videos have been uploaded.

**Request Format:**
- Content-Type: `application/json` or `multipart/form-data`
- Method: `POST`

**Request Body (JSON):**
```json
{
  "job_id": "uuid-here",
  "user_id": "user-uuid",
  "model": "gpt-5-mini"
}
```

**Or Form Data:**
- `job_id` (string, required) - Job ID from upload step
- `user_id` (string, required) - User ID
- `model` (string, optional) - AI model to use (default: 'gpt-5-mini')

**Request Headers:**
- `X-User-ID` (string) - User ID
- `X-API-Key` (string, optional) - API key if required
- `Authorization` (string, optional) - Bearer token

**Expected Response:**
```json
{
  "job_id": "uuid-here",
  "status": "running",
  "message": "Analysis started"
}
```

**Status Code:** `200 OK`

---

### 3. Poll Job Status

**Endpoint:** `GET /status/{job_id}`

**Purpose:** Check the status and progress of an analysis job.

**Request Format:**
- Method: `GET`
- Path Parameter: `job_id` (UUID)

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
    "overlay_url": "https://api.prodartscoach.com/results/{job_id}/overlay.mp4",
    "overlay_side_url": "https://api.prodartscoach.com/results/{job_id}/overlay_side.mp4",
    "overlay_front_url": "https://api.prodartscoach.com/results/{job_id}/overlay_front.mp4",
    "practice_plan_pdf_url": "https://api.prodartscoach.com/results/{job_id}/practice_plan.pdf",
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

### 4. Fetch Results

**Endpoint:** `GET /results/{job_id}/{resource}`

**Purpose:** Fetch specific result files (overlays, PDFs, etc.) for a completed job.

**Request Format:**
- Method: `GET`
- Path Parameters:
  - `job_id` (UUID) - Job ID
  - `resource` (string) - Resource name (e.g., `overlay.mp4`, `practice_plan.pdf`)

**Request Headers:**
- `X-User-ID` (string, optional) - User ID
- `X-API-Key` (string, optional) - API key if required
- `Authorization` (string, optional) - Bearer token

**Expected Response:**
- Content-Type: Depends on resource (video/mp4, application/pdf, etc.)
- Status Code: `200 OK`
- Body: Binary file content

**Example URLs:**
- `GET /results/{job_id}/overlay.mp4` - Overlay video
- `GET /results/{job_id}/overlay_side.mp4` - Side overlay video
- `GET /results/{job_id}/overlay_front.mp4` - Front overlay video
- `GET /results/{job_id}/practice_plan.pdf` - Practice plan PDF
- `GET /results/{job_id}/analysis.json` - Full analysis data (if available)

---

## 🔄 Typical Workflow

### Option 1: Two-Step (Upload then Analyze)

1. **Upload videos:**
   ```bash
   POST /upload
   FormData: side_video, front_video, user_id, job_id
   Response: { job_id, status: "uploaded" }
   ```

2. **Start analysis:**
   ```bash
   POST /analyze
   Body: { job_id, user_id, model }
   Response: { job_id, status: "running" }
   ```

3. **Poll status:**
   ```bash
   GET /status/{job_id}
   Response: { job_id, status: "running", progress: 0.5 }
   ```

4. **Fetch results:**
   ```bash
   GET /results/{job_id}/overlay.mp4
   GET /results/{job_id}/practice_plan.pdf
   ```

### Option 2: Single-Step (Upload and Analyze)

If `/analyze` accepts video files directly:

1. **Upload and analyze:**
   ```bash
   POST /analyze
   FormData: side_video, front_video, user_id, job_id, model
   Response: { job_id, status: "running" }
   ```

2. **Poll status:**
   ```bash
   GET /status/{job_id}
   Response: { job_id, status: "done", result: {...} }
   ```

3. **Fetch results:**
   ```bash
   GET /results/{job_id}/overlay.mp4
   GET /results/{job_id}/practice_plan.pdf
   ```

---

## 🔐 Authentication

The backend may require authentication via:
- **API Key**: `X-API-Key` header
- **Bearer Token**: `Authorization: Bearer <token>` header
- **User ID**: `X-User-ID` header (for user-specific operations)

---

## 📝 Integration Notes

### Current Frontend Implementation

The frontend currently:
1. Calls `/api/analyze` (Next.js API route)
2. Next.js route forwards to backend `/analyze` with videos
3. Frontend polls `/api/jobs/{jobId}` (Next.js API route)
4. Next.js route checks Supabase for job status

### Recommended Updates

To fully integrate with the backend:
1. Update `/api/analyze` to call backend `/upload` then `/analyze` (if two-step)
2. Update `/api/proxy/jobs/[jobId]` to call backend `/status/{job_id}`
3. Update result URLs to use `/results/{job_id}/...` format
4. Ensure `NEXT_PUBLIC_API_BASE_URL` points to backend URL

---

## 🌍 Environment Variables

```env
# Backend API URL
AI_BACKEND_URL=https://api.prodartscoach.com
NEXT_PUBLIC_API_BASE_URL=https://api.prodartscoach.com

# Optional: API Key if backend requires it
AI_BACKEND_API_KEY=your-api-key-here
```

---

## 🧪 Testing

### Test Upload
```bash
curl -X POST https://api.prodartscoach.com/upload \
  -F "side_video=@test-video.mp4" \
  -F "user_id=test-user" \
  -F "job_id=test-job" \
  -H "X-User-ID: test-user"
```

### Test Analyze
```bash
curl -X POST https://api.prodartscoach.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"job_id":"test-job","user_id":"test-user","model":"gpt-5-mini"}'
```

### Test Status
```bash
curl https://api.prodartscoach.com/status/test-job \
  -H "X-User-ID: test-user"
```

### Test Results
```bash
curl https://api.prodartscoach.com/results/test-job/overlay.mp4 \
  -H "X-User-ID: test-user" \
  -o overlay.mp4
```

---

**Note:** This specification is based on the backend endpoints you provided. If the actual implementation differs, please update this document accordingly.
