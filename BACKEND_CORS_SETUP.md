# Backend CORS Configuration Guide

## Overview

This guide explains how to configure CORS on your backend (`https://api.prodartscoach.com`) to allow direct file uploads from the frontend, bypassing the Next.js proxy and avoiding the 30-second headers timeout limitation.

## Why Configure CORS?

**Current Issue:**
- The Next.js proxy has a 30-second headers timeout (Node.js fetch limitation)
- Large file uploads can take longer than 30 seconds
- This causes `UND_ERR_HEADERS_TIMEOUT` errors

**Solution:**
- Configure CORS on your backend
- Enable direct uploads from browser to backend
- Bypass the proxy entirely
- No timeout limitations

## Step-by-Step Setup

### Step 1: Identify Your Backend Technology

Your backend is deployed via Docker at `https://api.prodartscoach.com`. Identify which technology you're using:

- **Python/FastAPI** - Most common for AI backends
- **Node.js/Express** - Common for Node.js backends
- **Docker with nginx** - If using nginx as reverse proxy
- **Other** - Flask, Django, Go, etc.

---

## Option A: Python/FastAPI Backend

### 1. Install CORS Middleware (if not already installed)

```bash
pip install fastapi[all]
# or
pip install python-multipart
```

### 2. Configure CORS in Your FastAPI App

**File: `main.py` or `app.py`**

```python
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os

app = FastAPI()

# CORS Configuration
# IMPORTANT: Update these origins for production
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Development
    "https://your-frontend-domain.com",  # Production - UPDATE THIS
    "https://your-vercel-app.vercel.app",  # Vercel preview deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-User-ID",
        "X-API-Key",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Your upload endpoint
@app.post("/upload")
async def upload_video(
    side_video: Optional[UploadFile] = File(None),
    front_video: Optional[UploadFile] = File(None),
    user_id: str = Form(...),
    job_id: str = Form(...),
    model: str = Form("gpt-5-mini"),
):
    """
    Upload video files for analysis.
    
    Returns 202 Accepted immediately, processes asynchronously.
    """
    # Validate that at least one video is provided
    if not side_video and not front_video:
        return {"error": "At least one video file is required"}, 400
    
    # TODO: Save files to storage (S3, local, etc.)
    # TODO: Queue job for async processing
    
    # Return 202 Accepted immediately
    return {
        "job_id": job_id,
        "status": "accepted",
        "message": "Upload accepted, processing will begin shortly"
    }, 202

@app.post("/analyze")
async def start_analysis(
    job_id: str = Form(...),
    user_id: str = Form(...),
    model: str = Form("gpt-5-mini"),
):
    """
    Start analysis for an uploaded job.
    """
    # TODO: Trigger analysis processing
    
    return {
        "job_id": job_id,
        "status": "running",
        "message": "Analysis started"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 3. Environment-Based Origins (Recommended)

**File: `.env` or environment variables**

```python
import os
from fastapi.middleware.cors import CORSMiddleware

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://your-frontend-domain.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],  # Allow all headers for simplicity
)
```

**Docker Compose or Environment:**

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

---

## Option B: Node.js/Express Backend

### 1. Install CORS Package

```bash
npm install cors
# or
yarn add cors
```

### 2. Configure CORS in Express

**File: `server.js` or `app.js`**

```javascript
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // For file uploads
const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',  // Development
      'https://your-frontend-domain.com',  // Production - UPDATE THIS
      'https://your-vercel-app.vercel.app',  // Vercel preview
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-User-ID',
    'X-API-Key',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 3600,  // Cache preflight for 1 hour
};

app.use(cors(corsOptions));

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',  // Or use S3, cloud storage, etc.
  limits: {
    fileSize: 500 * 1024 * 1024,  // 500MB max per file
  },
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
    
    // TODO: Save files and queue for processing
    
    // Return 202 Accepted immediately
    return res.status(202).json({
      job_id: job_id,
      status: 'accepted',
      message: 'Upload accepted, processing will begin shortly'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/analyze', async (req, res) => {
  const { job_id, user_id, model } = req.body;
  
  // TODO: Trigger analysis
  
  return res.json({
    job_id: job_id,
    status: 'running',
    message: 'Analysis started'
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. Environment-Based Configuration

**File: `.env`**

```env
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

**File: `server.js`**

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['*'],
}));
```

---

## Option C: Docker with nginx Reverse Proxy

If your backend is behind nginx, configure CORS at the nginx level:

### 1. nginx Configuration

**File: `nginx.conf` or `/etc/nginx/sites-available/default`**

```nginx
server {
    listen 80;
    server_name api.prodartscoach.com;

    # CORS Headers
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-User-ID, X-API-Key, Accept, Origin, X-Requested-With' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length, Content-Type' always;
    add_header 'Access-Control-Max-Age' '3600' always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-User-ID, X-API-Key, Accept, Origin, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' '3600' always;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' '0';
        return 204;
    }

    # Proxy to backend
    location / {
        proxy_pass http://backend:8000;  # Your backend service
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for large uploads
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        client_max_body_size 500M;  # Allow large file uploads
    }
}
```

### 2. Restart nginx

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo nginx -s reload
# or
sudo systemctl reload nginx
```

### 3. Docker Compose Example

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro  # If using SSL
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build: .
    # Your backend configuration
    environment:
      - ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
    restart: unless-stopped
```

---

## Option D: Other Backend Technologies

### Flask (Python)

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

CORS(app, 
     origins=["http://localhost:3000", "https://your-frontend-domain.com"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-ID", "X-API-Key"],
     supports_credentials=True)
```

### Django (Python)

**File: `settings.py`**

```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    ...
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://your-frontend-domain.com",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
CORS_ALLOW_HEADERS = [
    'content-type',
    'authorization',
    'x-user-id',
    'x-api-key',
]
```

### Go (Gin)

```go
package main

import (
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{
        "http://localhost:3000",
        "https://your-frontend-domain.com",
    }
    config.AllowCredentials = true
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}
    config.AllowHeaders = []string{
        "Content-Type",
        "Authorization",
        "X-User-ID",
        "X-API-Key",
    }
    
    r.Use(cors.New(config))
    
    // Your routes...
    r.POST("/upload", uploadHandler)
    
    r.Run(":8000")
}
```

---

## Step 2: Update Frontend to Use Direct Uploads

Once CORS is configured, update the frontend to use direct uploads:

### Update `lib/api/analysis.ts`

**Current code (using proxy):**

```typescript
// Use proxy endpoint (handles CORS and streams data)
const proxyUploadEndpoint = `/api/analyze/proxy-upload?job_id=${encodeURIComponent(job_id)}`;

const uploadResponse = await authenticatedFetch(proxyUploadEndpoint, {
  method: 'POST',
  body: uploadFormData,
});
```

**Updated code (direct upload):**

```typescript
// Use direct upload endpoint (bypasses proxy, no timeout issues)
const directUploadEndpoint = upload_endpoint || 
  (backend_url ? `${backend_url}/upload` : null) ||
  (process.env.NEXT_PUBLIC_AI_BACKEND_URL ? `${process.env.NEXT_PUBLIC_AI_BACKEND_URL}/upload` : null) ||
  (process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload` : null);

if (!directUploadEndpoint) {
  throw new ApiError('Backend upload URL not configured', 500);
}

// Get auth token for direct upload
const token = await getAuthToken();

// Upload directly to backend
const uploadResponse = await fetch(directUploadEndpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-ID': user_id || userId || '',
    ...(process.env.AI_BACKEND_API_KEY && {
      'X-API-Key': process.env.AI_BACKEND_API_KEY,
    }),
    // Don't set Content-Type - browser will set it with boundary
  },
  body: uploadFormData,
  // No timeout - browser handles it
});
```

---

## Step 3: Test CORS Configuration

### Test with curl

```bash
# Test preflight request (OPTIONS)
curl -X OPTIONS https://api.prodartscoach.com/upload \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Expected response should include:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-API-Key
```

### Test with Browser Console

```javascript
// Open browser console on your frontend (http://localhost:3000)
fetch('https://api.prodartscoach.com/upload', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type,Authorization',
  },
})
.then(r => {
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': r.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Headers': r.headers.get('Access-Control-Allow-Headers'),
  });
});
```

---

## Security Considerations

### 1. Restrict Origins in Production

**❌ Bad (allows all origins):**
```python
allow_origins=["*"]  # DON'T DO THIS IN PRODUCTION
```

**✅ Good (specific origins):**
```python
allow_origins=[
    "https://your-frontend-domain.com",
    "https://www.your-frontend-domain.com",
]
```

### 2. Use Environment Variables

Never hardcode origins. Use environment variables:

```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
```

### 3. Validate Headers

Only allow necessary headers:

```python
allow_headers=[
    "Content-Type",
    "Authorization",
    "X-User-ID",
    "X-API-Key",
]
```

### 4. Use HTTPS in Production

Always use HTTPS for production APIs to prevent man-in-the-middle attacks.

---

## Troubleshooting

### Issue: CORS errors still occurring

**Check:**
1. Origin is in the allowed list (exact match, including protocol and port)
2. Headers are allowed
3. Methods are allowed
4. Credentials are set correctly

### Issue: Preflight requests failing

**Solution:** Ensure OPTIONS requests return 204 with proper headers.

### Issue: Large file uploads timing out

**Solution:** Increase backend timeout settings:
- nginx: `client_max_body_size 500M; proxy_read_timeout 600s;`
- FastAPI: `timeout_keep_alive=600`
- Express: `timeout: 600000`

---

## Next Steps

After configuring CORS:

1. ✅ Test with small files first
2. ✅ Test with large files (>100MB)
3. ✅ Update frontend to use direct uploads
4. ✅ Monitor for CORS errors in production
5. ✅ Set up proper error handling

Once CORS is working, you can remove the proxy endpoint or keep it as a fallback.
