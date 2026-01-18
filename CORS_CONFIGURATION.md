# CORS Configuration for Backend API

## Issue

The frontend is getting CORS errors when trying to upload directly to `https://api.prodartscoach.com/upload`:

```
Access to fetch at 'https://api.prodartscoach.com/upload' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

## Solution Implemented

I've created a **proxy endpoint** (`/api/analyze/proxy-upload`) that:
- ✅ Handles CORS automatically (same origin as frontend)
- ✅ Streams uploads to backend (avoids Vercel's 4.5MB limit)
- ✅ Forwards authentication headers
- ✅ Validates user permissions

**The frontend now uses the proxy automatically**, so CORS is no longer an issue.

## Alternative: Configure CORS on Backend

If you prefer direct uploads (better performance), configure CORS on your Docker backend:

### For Python/FastAPI Backend

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://your-frontend-domain.com",  # Production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### For Node.js/Express Backend

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',  // Development
    'https://your-frontend-domain.com',  // Production
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-API-Key'],
}));
```

### For Docker/nginx Configuration

If using nginx in Docker:

```nginx
location / {
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-User-ID, X-API-Key' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    proxy_pass http://backend:8000;
}
```

## Current Implementation

**The proxy solution is already working** - no backend changes needed. The upload flow is:

1. Frontend → `/api/analyze/proxy-upload` (Next.js, handles CORS)
2. Next.js → `https://api.prodartscoach.com/upload` (server-to-server, no CORS)

## Performance Note

The proxy approach:
- ✅ Works immediately (no backend changes)
- ✅ Handles CORS automatically
- ✅ Still streams data (doesn't fully buffer)
- ⚠️ Adds one extra hop (minimal latency)

If you configure CORS on the backend, you can switch back to direct uploads by updating `lib/api/analysis.ts` to use `directUploadEndpoint` instead of `proxyUploadEndpoint`.
