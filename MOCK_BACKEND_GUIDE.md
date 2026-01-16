# Mock Backend Guide

This guide shows you how to create a simple mock backend for testing the video analysis dashboard without a real AI backend.

## 🎯 Purpose

The mock backend simulates the AI backend API so you can:
- Test the complete upload → processing → results workflow
- See how the UI displays results
- Test error scenarios
- Develop without waiting for real AI processing

## 🚀 Quick Start (Python FastAPI)

### Step 1: Create Mock Backend

Create a new file `mock-backend/main.py`:

```python
from fastapi import FastAPI, File, UploadFile, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uuid
import time
import asyncio
from typing import Optional
import os
from supabase import create_client, Client

app = FastAPI(title="Mock AI Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client (for updating job status)
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Optional[Client] = None

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

# Store job statuses (in production, use database)
job_statuses = {}

@app.get("/")
async def root():
    return {"message": "Mock AI Backend is running", "version": "1.0.0"}

@app.post("/analyze")
async def analyze_video(
    model: str = Form("gpt-5-mini"),
    side_video: Optional[UploadFile] = File(None),
    front_video: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),  # Legacy support
    user_id: str = Form(...),
    job_id: str = Form(...),
    user_email: Optional[str] = Form(None),
    x_user_id: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
):
    """
    Mock video analysis endpoint
    
    Simulates video processing by:
    1. Accepting video uploads
    2. Processing in background (simulated)
    3. Returning mock results after delay
    4. Updating Supabase job status
    """
    
    # Determine which video was uploaded
    video_file = side_video or front_video or video
    if not video_file:
        raise HTTPException(status_code=400, detail="No video file provided")
    
    print(f"📹 Received video: {video_file.filename}")
    print(f"👤 User ID: {user_id}")
    print(f"🆔 Job ID: {job_id}")
    print(f"🤖 Model: {model}")
    
    # Update job status to running in Supabase
    if supabase:
        try:
            supabase.table("jobs").update({
                "status": "running",
                "progress": 0.1,
            }).eq("job_id", job_id).execute()
        except Exception as e:
            print(f"⚠️  Could not update Supabase: {e}")
    
    # Store job info
    job_statuses[job_id] = {
        "status": "running",
        "progress": 0.1,
        "stage": "Processing video analysis...",
    }
    
    # Simulate processing in background
    asyncio.create_task(process_video_async(job_id, video_file.filename, user_id))
    
    # Return immediately (async processing)
    return JSONResponse({
        "job_id": job_id,
        "status": "running",
        "message": "Video analysis started"
    })

async def process_video_async(job_id: str, filename: str, user_id: str):
    """
    Simulate video processing with progress updates
    """
    stages = [
        (0.2, "Analyzing video frames..."),
        (0.4, "Detecting throw mechanics..."),
        (0.6, "Calculating scores..."),
        (0.8, "Generating coaching plan..."),
        (1.0, "Analysis complete!"),
    ]
    
    for progress, stage in stages:
        await asyncio.sleep(2)  # Simulate 2 seconds per stage
        
        # Update job status
        job_statuses[job_id] = {
            "status": "running",
            "progress": progress,
            "stage": stage,
        }
        
        # Update Supabase
        if supabase:
            try:
                supabase.table("jobs").update({
                    "status": "running",
                    "progress": progress,
                    "stage": stage,
                }).eq("job_id", job_id).execute()
            except Exception as e:
                print(f"⚠️  Could not update Supabase: {e}")
    
    # Generate mock results
    mock_results = generate_mock_results(job_id, filename)
    
    # Update job status to done
    job_statuses[job_id] = {
        "status": "done",
        "progress": 1.0,
        "result": mock_results,
    }
    
    # Update Supabase with results
    if supabase:
        try:
            supabase.table("jobs").update({
                "status": "done",
                "progress": 1.0,
                "overlay_url": mock_results.get("overlay_url"),
                "overlay_side_url": mock_results.get("overlay_side_url"),
                "overlay_front_url": mock_results.get("overlay_front_url"),
                "practice_plan_pdf_url": mock_results.get("practice_plan_pdf_url"),
                "throws_detected": mock_results.get("throws_detected", 5),
                "result_data": mock_results,
            }).eq("job_id", job_id).execute()
        except Exception as e:
            print(f"⚠️  Could not update Supabase: {e}")
    
    print(f"✅ Job {job_id} completed!")

def generate_mock_results(job_id: str, filename: str) -> dict:
    """
    Generate mock analysis results
    """
    return {
        "overlay_url": f"https://example.com/videos/{job_id}/overlay.mp4",
        "overlay_side_url": f"https://example.com/videos/{job_id}/overlay_side.mp4",
        "overlay_front_url": f"https://example.com/videos/{job_id}/overlay_front.mp4",
        "practice_plan_pdf_url": f"https://example.com/pdfs/{job_id}/practice_plan.pdf",
        "throws_detected": 5,
        "scorecard": {
            "overall_score": 7.5,
            "accuracy": 8.0,
            "consistency": 7.0,
            "technique": 7.5,
            "power": 8.5,
        },
        "coaching_plan": {
            "focus_areas": [
                "Improve release timing",
                "Strengthen follow-through",
                "Maintain consistent stance",
            ],
            "drills": [
                {
                    "name": "Release Timing Drill",
                    "description": "Practice releasing at the peak of your throw",
                    "reps": 20,
                },
                {
                    "name": "Follow-Through Exercise",
                    "description": "Focus on extending your arm fully after release",
                    "reps": 15,
                },
            ],
        },
        "lesson_plan": {
            "title": "Improve Your Throw Technique",
            "lessons": [
                {
                    "title": "Release Timing",
                    "description": "Learn when to release for maximum accuracy",
                },
                {
                    "title": "Follow-Through",
                    "description": "Master the follow-through motion",
                },
            ],
        },
    }

@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """
    Get job status (mocked)
    """
    if job_id not in job_statuses:
        # Try to get from Supabase
        if supabase:
            try:
                result = supabase.table("jobs").select("*").eq("job_id", job_id).single().execute()
                if result.data:
                    job = result.data
                    return {
                        "job_id": job_id,
                        "status": job.get("status", "queued"),
                        "progress": float(job.get("progress", 0)),
                        "stage": job.get("stage"),
                        "result": job.get("result_data"),
                    }
            except Exception as e:
                print(f"⚠️  Could not fetch from Supabase: {e}")
        
        return JSONResponse(
            {"job_id": job_id, "status": "not_found"},
            status_code=404
        )
    
    job = job_statuses[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job.get("progress", 0),
        "stage": job.get("stage"),
        "result": job.get("result"),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 2: Install Dependencies

Create `mock-backend/requirements.txt`:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
supabase==2.0.0
python-dotenv==1.0.0
```

Install dependencies:
```bash
cd mock-backend
pip install -r requirements.txt
```

### Step 3: Configure Environment

Create `mock-backend/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 4: Run Mock Backend

```bash
cd mock-backend
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`

### Step 5: Configure Frontend

Update `.env.local`:

```env
AI_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Restart your Next.js dev server:
```bash
npm run dev
```

### Step 6: Test

1. Go to `http://localhost:3000/dashboard/analyze`
2. Upload a video
3. Watch the job progress: `queued` → `running` → `done`
4. Results should appear automatically!

## 🎨 Mock Results Format

The mock backend returns results in this format:

```json
{
  "overlay_url": "https://example.com/videos/{job_id}/overlay.mp4",
  "overlay_side_url": "https://example.com/videos/{job_id}/overlay_side.mp4",
  "overlay_front_url": "https://example.com/videos/{job_id}/overlay_front.mp4",
  "practice_plan_pdf_url": "https://example.com/pdfs/{job_id}/practice_plan.pdf",
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
```

## 🔧 Alternative: Node.js Mock Backend

If you prefer Node.js, create `mock-backend/server.js`:

```javascript
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const jobStatuses = {};

app.get('/', (req, res) => {
  res.json({ message: 'Mock AI Backend is running', version: '1.0.0' });
});

app.post('/analyze', upload.fields([
  { name: 'side_video', maxCount: 1 },
  { name: 'front_video', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  const { user_id, job_id, model = 'gpt-5-mini' } = req.body;
  const videoFile = req.files?.side_video?.[0] || req.files?.front_video?.[0] || req.files?.video?.[0];
  
  if (!videoFile) {
    return res.status(400).json({ error: 'No video file provided' });
  }
  
  console.log(`📹 Received video: ${videoFile.originalname}`);
  console.log(`👤 User ID: ${user_id}`);
  console.log(`🆔 Job ID: ${job_id}`);
  
  // Update job status
  if (supabase) {
    try {
      await supabase
        .from('jobs')
        .update({ status: 'running', progress: 0.1 })
        .eq('job_id', job_id);
    } catch (e) {
      console.error('⚠️  Could not update Supabase:', e);
    }
  }
  
  jobStatuses[job_id] = {
    status: 'running',
    progress: 0.1,
    stage: 'Processing video analysis...',
  };
  
  // Simulate processing
  processVideoAsync(job_id, videoFile.originalname, user_id);
  
  res.json({
    job_id,
    status: 'running',
    message: 'Video analysis started'
  });
});

async function processVideoAsync(jobId, filename, userId) {
  const stages = [
    [0.2, 'Analyzing video frames...'],
    [0.4, 'Detecting throw mechanics...'],
    [0.6, 'Calculating scores...'],
    [0.8, 'Generating coaching plan...'],
    [1.0, 'Analysis complete!'],
  ];
  
  for (const [progress, stage] of stages) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    jobStatuses[jobId] = { status: 'running', progress, stage };
    
    if (supabase) {
      try {
        await supabase
          .from('jobs')
          .update({ status: 'running', progress, stage })
          .eq('job_id', jobId);
      } catch (e) {
        console.error('⚠️  Could not update Supabase:', e);
      }
    }
  }
  
  const mockResults = generateMockResults(jobId, filename);
  
  jobStatuses[jobId] = {
    status: 'done',
    progress: 1.0,
    result: mockResults,
  };
  
  if (supabase) {
    try {
      await supabase
        .from('jobs')
        .update({
          status: 'done',
          progress: 1.0,
          overlay_url: mockResults.overlay_url,
          overlay_side_url: mockResults.overlay_side_url,
          overlay_front_url: mockResults.overlay_front_url,
          practice_plan_pdf_url: mockResults.practice_plan_pdf_url,
          throws_detected: mockResults.throws_detected,
          result_data: mockResults,
        })
        .eq('job_id', jobId);
    } catch (e) {
      console.error('⚠️  Could not update Supabase:', e);
    }
  }
  
  console.log(`✅ Job ${jobId} completed!`);
}

function generateMockResults(jobId, filename) {
  return {
    overlay_url: `https://example.com/videos/${jobId}/overlay.mp4`,
    overlay_side_url: `https://example.com/videos/${jobId}/overlay_side.mp4`,
    overlay_front_url: `https://example.com/videos/${jobId}/overlay_front.mp4`,
    practice_plan_pdf_url: `https://example.com/pdfs/${jobId}/practice_plan.pdf`,
    throws_detected: 5,
    scorecard: {
      overall_score: 7.5,
      accuracy: 8.0,
      consistency: 7.0,
      technique: 7.5,
      power: 8.5,
    },
    coaching_plan: {
      focus_areas: [
        'Improve release timing',
        'Strengthen follow-through',
        'Maintain consistent stance',
      ],
      drills: [
        {
          name: 'Release Timing Drill',
          description: 'Practice releasing at the peak of your throw',
          reps: 20,
        },
      ],
    },
    lesson_plan: {
      title: 'Improve Your Throw Technique',
      lessons: [
        {
          title: 'Release Timing',
          description: 'Learn when to release for maximum accuracy',
        },
      ],
    },
  };
}

app.get('/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  if (!jobStatuses[jobId]) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .eq('job_id', jobId)
          .single();
        
        if (data) {
          return res.json({
            job_id: jobId,
            status: data.status,
            progress: data.progress,
            stage: data.stage,
            result: data.result_data,
          });
        }
      } catch (e) {
        console.error('⚠️  Could not fetch from Supabase:', e);
      }
    }
    
    return res.status(404).json({ job_id: jobId, status: 'not_found' });
  }
  
  const job = jobStatuses[jobId];
  res.json({
    job_id: jobId,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    result: job.result,
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Mock backend running on http://localhost:${PORT}`);
});
```

Install Node.js dependencies:
```bash
cd mock-backend
npm init -y
npm install express multer cors @supabase/supabase-js
```

Run:
```bash
node server.js
```

## 🎯 Features

The mock backend:
- ✅ Accepts video uploads
- ✅ Updates Supabase job status
- ✅ Simulates processing with progress updates
- ✅ Returns mock results after ~10 seconds
- ✅ Supports both side_video and front_video
- ✅ Includes user context (user_id, job_id)

## 🔍 Testing the Mock Backend

### Test Health Check
```bash
curl http://localhost:8000/
```

### Test Video Upload
```bash
curl -X POST http://localhost:8000/analyze \
  -F "side_video=@test-video.mp4" \
  -F "user_id=test-user-123" \
  -F "job_id=test-job-456" \
  -F "model=gpt-5-mini"
```

### Test Job Status
```bash
curl http://localhost:8000/jobs/test-job-456
```

## 🐛 Troubleshooting

### Backend Not Starting
- Check if port 8000 is available
- Verify Python/Node.js is installed
- Check dependencies are installed

### Supabase Updates Not Working
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check Supabase connection in backend logs
- Verify job_id exists in database

### Frontend Not Connecting
- Verify `AI_BACKEND_URL=http://localhost:8000` in `.env.local`
- Restart Next.js dev server after changing env vars
- Check CORS is enabled in mock backend

---

**Next:** Connect your real AI backend using [BACKEND_INTEGRATION_GUIDE.md](./BACKEND_INTEGRATION_GUIDE.md)
