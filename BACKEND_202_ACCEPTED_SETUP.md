# Backend 202 Accepted Implementation Guide

## Overview

This guide explains how to modify your backend to return `202 Accepted` immediately for large file uploads, then process them asynchronously. This solves the 30-second headers timeout issue by allowing the backend to respond quickly while processing happens in the background.

## Why 202 Accepted?

**Problem:**
- Large file uploads can take minutes to process
- Node.js fetch has a 30-second headers timeout
- Backend can't respond in time, causing timeouts

**Solution:**
- Return `202 Accepted` immediately after accepting the upload
- Process files asynchronously in the background
- Client polls for status updates

## Architecture Pattern

```
1. Client uploads file → Backend
2. Backend saves file → Returns 202 Accepted immediately
3. Backend queues job → Background worker processes
4. Client polls status → GET /status/{job_id}
5. Processing completes → Status changes to "done"
```

---

## Implementation Examples

### Option A: Python/FastAPI with Background Tasks

#### 1. Basic Implementation

**File: `main.py`**

```python
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import asyncio
import uuid
from datetime import datetime

app = FastAPI()

# CORS configuration (see BACKEND_CORS_SETUP.md)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# In-memory job status (use Redis/DB in production)
job_status = {}

async def process_video_analysis(job_id: str, user_id: str, model: str, video_paths: dict):
    """
    Background task to process video analysis.
    This runs asynchronously after 202 is returned.
    """
    try:
        # Update status to running
        job_status[job_id] = {
            "status": "running",
            "progress": 0.0,
            "stage": "Starting analysis...",
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        # Step 1: Process side video (if provided)
        if video_paths.get("side_video"):
            job_status[job_id]["stage"] = "Processing side-on video..."
            job_status[job_id]["progress"] = 0.2
            # TODO: Your video processing logic here
            await asyncio.sleep(1)  # Simulate processing
        
        # Step 2: Process front video (if provided)
        if video_paths.get("front_video"):
            job_status[job_id]["stage"] = "Processing front-on video..."
            job_status[job_id]["progress"] = 0.4
            # TODO: Your video processing logic here
            await asyncio.sleep(1)
        
        # Step 3: Run AI analysis
        job_status[job_id]["stage"] = "Running AI analysis..."
        job_status[job_id]["progress"] = 0.6
        # TODO: Call your AI model
        await asyncio.sleep(2)
        
        # Step 4: Generate results
        job_status[job_id]["stage"] = "Generating results..."
        job_status[job_id]["progress"] = 0.8
        # TODO: Generate overlay video, PDF, etc.
        await asyncio.sleep(1)
        
        # Step 5: Complete
        job_status[job_id]["status"] = "done"
        job_status[job_id]["progress"] = 1.0
        job_status[job_id]["stage"] = "Complete"
        job_status[job_id]["result"] = {
            "overlay_url": f"/results/{job_id}/overlay.mp4",
            "practice_plan_pdf_url": f"/results/{job_id}/practice_plan.pdf",
            # ... other results
        }
        job_status[job_id]["updated_at"] = datetime.utcnow().isoformat()
        
    except Exception as e:
        job_status[job_id] = {
            "status": "failed",
            "error": str(e),
            "updated_at": datetime.utcnow().isoformat(),
        }

@app.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    side_video: Optional[UploadFile] = File(None),
    front_video: Optional[UploadFile] = File(None),
    user_id: str = Form(...),
    job_id: str = Form(...),
    model: str = Form("gpt-5-mini"),
):
    """
    Upload video files.
    Returns 202 Accepted immediately, processes in background.
    """
    # Validate input
    if not side_video and not front_video:
        return {"error": "At least one video file is required"}, 400
    
    # Save files (quick operation)
    video_paths = {}
    
    if side_video:
        # Save to storage (S3, local filesystem, etc.)
        file_path = f"uploads/{job_id}/side_video.mp4"
        # TODO: Save file (e.g., to S3, local storage, etc.)
        video_paths["side_video"] = file_path
        # For now, just read and store path
        # In production, save to cloud storage
    
    if front_video:
        file_path = f"uploads/{job_id}/front_video.mp4"
        # TODO: Save file
        video_paths["front_video"] = file_path
    
    # Initialize job status
    job_status[job_id] = {
        "job_id": job_id,
        "status": "accepted",
        "progress": 0.0,
        "stage": "Upload accepted, queued for processing",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    # Queue background task
    background_tasks.add_task(
        process_video_analysis,
        job_id=job_id,
        user_id=user_id,
        model=model,
        video_paths=video_paths,
    )
    
    # Return 202 Accepted immediately
    return {
        "job_id": job_id,
        "status": "accepted",
        "message": "Upload accepted, processing will begin shortly",
        "status_url": f"/status/{job_id}",
    }, 202

@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Get the status of a job.
    Client polls this endpoint to check progress.
    """
    if job_id not in job_status:
        return {"error": "Job not found"}, 404
    
    return job_status[job_id]

@app.post("/analyze")
async def start_analysis(
    job_id: str = Form(...),
    user_id: str = Form(...),
    model: str = Form("gpt-5-mini"),
):
    """
    Start analysis for an uploaded job.
    This can trigger processing if not already started.
    """
    if job_id not in job_status:
        return {"error": "Job not found"}, 404
    
    # If job is accepted, trigger processing
    if job_status[job_id]["status"] == "accepted":
        job_status[job_id]["status"] = "running"
        job_status[job_id]["stage"] = "Starting analysis..."
        # TODO: Trigger background processing if not already started
    
    return {
        "job_id": job_id,
        "status": job_status[job_id]["status"],
        "message": "Analysis started" if job_status[job_id]["status"] == "running" else "Analysis already in progress",
    }
```

#### 2. Production-Ready with Celery (Recommended)

For production, use Celery for background task processing:

**File: `main.py`**

```python
from fastapi import FastAPI, UploadFile, File, Form
from celery import Celery
from typing import Optional
import os

app = FastAPI()

# Celery configuration
celery_app = Celery(
    "video_processor",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

@celery_app.task(name="process_video_analysis")
def process_video_analysis_task(job_id: str, user_id: str, model: str, video_paths: dict):
    """
    Celery task to process video analysis.
    Runs in separate worker process.
    """
    # Your processing logic here
    # Update status in database/Redis
    pass

@app.post("/upload")
async def upload_video(
    side_video: Optional[UploadFile] = File(None),
    front_video: Optional[UploadFile] = File(None),
    user_id: str = Form(...),
    job_id: str = Form(...),
    model: str = Form("gpt-5-mini"),
):
    """
    Upload video files.
    Returns 202 Accepted immediately.
    """
    # Save files to storage
    video_paths = {}
    if side_video:
        # Save to S3, etc.
        video_paths["side_video"] = save_file(side_video, job_id, "side")
    if front_video:
        video_paths["front_video"] = save_file(front_video, job_id, "front")
    
    # Queue Celery task
    process_video_analysis_task.delay(job_id, user_id, model, video_paths)
    
    # Update database status
    update_job_status(job_id, "accepted", "Upload accepted, queued for processing")
    
    return {
        "job_id": job_id,
        "status": "accepted",
        "message": "Upload accepted, processing will begin shortly",
    }, 202
```

**File: `celery_worker.py`**

```python
from celery import Celery
import os

celery_app = Celery(
    "video_processor",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

# Import tasks
from main import process_video_analysis_task

if __name__ == "__main__":
    celery_app.start()
```

**Run Celery worker:**

```bash
celery -A celery_worker worker --loglevel=info
```

---

### Option B: Node.js/Express with Queue

#### 1. Basic Implementation with Bull Queue

**File: `server.js`**

```javascript
const express = require('express');
const multer = require('multer');
const Queue = require('bull');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Redis queue for background jobs
const videoQueue = new Queue('video processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

// Job status storage (use Redis/DB in production)
const jobStatus = {};

// Multer configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Process video in background
videoQueue.process(async (job) => {
  const { jobId, userId, model, videoPaths } = job.data;
  
  try {
    // Update status
    jobStatus[jobId] = {
      status: 'running',
      progress: 0.0,
      stage: 'Starting analysis...',
    };
    
    // Process videos
    // TODO: Your processing logic
    
    // Update progress
    jobStatus[jobId].progress = 0.5;
    jobStatus[jobId].stage = 'Processing videos...';
    
    // Run AI analysis
    // TODO: Call AI model
    
    jobStatus[jobId].progress = 0.8;
    jobStatus[jobId].stage = 'Generating results...';
    
    // Complete
    jobStatus[jobId] = {
      status: 'done',
      progress: 1.0,
      stage: 'Complete',
      result: {
        overlay_url: `/results/${jobId}/overlay.mp4`,
        practice_plan_pdf_url: `/results/${jobId}/practice_plan.pdf`,
      },
    };
  } catch (error) {
    jobStatus[jobId] = {
      status: 'failed',
      error: error.message,
    };
  }
});

// Upload endpoint
app.post('/upload', upload.fields([
  { name: 'side_video', maxCount: 1 },
  { name: 'front_video', maxCount: 1 },
]), async (req, res) => {
  try {
    const { user_id, job_id, model } = req.body;
    
    if (!req.files || (!req.files.side_video && !req.files.front_video)) {
      return res.status(400).json({
        error: 'At least one video file is required'
      });
    }
    
    // Save file paths
    const videoPaths = {};
    if (req.files.side_video) {
      videoPaths.side_video = req.files.side_video[0].path;
    }
    if (req.files.front_video) {
      videoPaths.front_video = req.files.front_video[0].path;
    }
    
    // Initialize job status
    jobStatus[job_id] = {
      job_id,
      status: 'accepted',
      progress: 0.0,
      stage: 'Upload accepted, queued for processing',
    };
    
    // Queue job for processing
    await videoQueue.add({
      jobId: job_id,
      userId: user_id,
      model: model || 'gpt-5-mini',
      videoPaths,
    });
    
    // Return 202 Accepted immediately
    return res.status(202).json({
      job_id,
      status: 'accepted',
      message: 'Upload accepted, processing will begin shortly',
      status_url: `/status/${job_id}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// Status endpoint
app.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  if (!jobStatus[jobId]) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  return res.json(jobStatus[jobId]);
});

// Start analysis endpoint
app.post('/analyze', async (req, res) => {
  const { job_id, user_id, model } = req.body;
  
  if (!jobStatus[job_id]) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Trigger processing if not already started
  if (jobStatus[job_id].status === 'accepted') {
    // Queue job if not already queued
    // (In production, check if job is already in queue)
  }
  
  return res.json({
    job_id,
    status: jobStatus[job_id].status,
    message: 'Analysis started',
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Install dependencies:**

```bash
npm install express multer bull redis
```

---

## Frontend Integration

### Update Frontend to Handle 202 Accepted

**File: `lib/api/analysis.ts`**

```typescript
// After upload, check if backend returned 202
const uploadResponse = await fetch(directUploadEndpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-ID': user_id || userId || '',
  },
  body: uploadFormData,
});

if (uploadResponse.status === 202) {
  // Backend accepted upload, processing in background
  const responseData = await uploadResponse.json();
  console.log('Upload accepted, job queued:', responseData.job_id);
  
  // Start polling for status
  // The job will transition from "accepted" → "running" → "done"
  return { job_id: responseData.job_id };
} else if (!uploadResponse.ok) {
  // Handle error
  throw new ApiError('Upload failed', uploadResponse.status);
}
```

### Update Status Polling

**File: `lib/hooks/useAnalysis.ts`**

```typescript
const pollJobStatus = useCallback(async (jobId: string) => {
  try {
    const status = await getJobStatus(jobId);
    
    // Handle different statuses
    if (status.status === 'accepted') {
      // Job is queued, keep polling
      setProgressMessage('Upload accepted, waiting for processing to start...');
    } else if (status.status === 'running') {
      // Job is processing
      setProgressMessage(status.stage || 'Processing video analysis...');
      setProgress(status.progress || 0);
    } else if (status.status === 'done') {
      // Job complete
      setState('completed');
      setResult({
        jobId: status.job_id,
        status: 'done',
        result: status.result,
        createdAt: Date.now(),
      });
      stopPolling();
    } else if (status.status === 'failed') {
      // Job failed
      setState('error');
      setProgressMessage(`Analysis failed: ${status.error || 'Unknown error'}`);
      stopPolling();
    }
  } catch (error) {
    console.error('Error polling job status:', error);
  }
}, []);
```

---

## Best Practices

### 1. Use Database/Redis for Job Status

**Don't use in-memory storage in production:**

```python
# ❌ Bad - lost on server restart
job_status = {}

# ✅ Good - persistent storage
def update_job_status(job_id: str, status: str, stage: str, progress: float = 0.0):
    db.execute(
        "UPDATE jobs SET status = %s, stage = %s, progress = %s WHERE job_id = %s",
        (status, stage, progress, job_id)
    )
```

### 2. Implement Retry Logic

```python
@celery_app.task(bind=True, max_retries=3)
def process_video_analysis_task(self, job_id: str, ...):
    try:
        # Process video
        pass
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

### 3. Set Appropriate Timeouts

```python
# FastAPI - increase timeout for large uploads
app = FastAPI()
# Configure uvicorn with longer timeout
uvicorn.run(app, timeout_keep_alive=600)
```

### 4. Monitor Queue Health

```python
# Check queue length
queue_length = celery_app.control.inspect().active()
if queue_length > 100:
    # Alert: queue is backing up
    send_alert("Video processing queue is backing up")
```

---

## Testing

### Test 202 Response

```bash
# Upload a file
curl -X POST https://api.prodartscoach.com/upload \
  -F "side_video=@test-video.mp4" \
  -F "user_id=test-user" \
  -F "job_id=test-job-123" \
  -v

# Expected: HTTP/1.1 202 Accepted
# Response: {"job_id": "test-job-123", "status": "accepted", ...}
```

### Test Status Polling

```bash
# Check status
curl https://api.prodartscoach.com/status/test-job-123

# Expected progression:
# 1. {"status": "accepted", "progress": 0.0, ...}
# 2. {"status": "running", "progress": 0.5, "stage": "Processing..."}
# 3. {"status": "done", "progress": 1.0, "result": {...}}
```

---

## Summary

1. **Accept upload quickly** → Save files, return 202 Accepted
2. **Queue for processing** → Use background tasks (Celery, Bull, etc.)
3. **Update status** → Store in database/Redis
4. **Client polls** → GET /status/{job_id} to check progress
5. **Return results** → When status is "done", return result URLs

This pattern solves the timeout issue by responding immediately while processing happens asynchronously.
