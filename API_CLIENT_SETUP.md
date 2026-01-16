# API Client Setup Summary

## ✅ Completed Tasks

### 1. Environment Configuration Files

#### `.env.example`
- Created comprehensive environment variable template
- Includes all required and optional variables
- Includes comments and examples
- Ready to copy to `.env.local`

#### Environment Variables Added
- `NEXT_PUBLIC_API_BASE_URL` - Base URL for AI backend (client-side)
- Updated documentation for `AI_BACKEND_URL` distinction

### 2. API Client Library

#### `lib/api/client.ts`
- **ApiClient class**: Full-featured HTTP client
  - Methods: `get()`, `post()`, `put()`, `delete()`
  - Automatic error handling
  - API key support
  - FormData support
  
- **Utility functions**:
  - `getApiBaseUrl()` - Get configured API base URL
  - `absUrl()` - Convert relative URLs to absolute
  - `createApiClient()` - Create custom client instances

- **ApiError class**: Custom error handling with status codes

#### `lib/api/index.ts`
- Centralized exports for easy importing

### 3. Component Updates

#### Updated Components to Use API Client
- `components/dashboard/OverlayPanel.tsx` - Now uses `absUrl()` from API client
- `app/dashboard/analyze/[jobId]/page.tsx` - Now uses `absUrl()` from API client

### 4. Documentation Updates

#### `README.md`
- Added `NEXT_PUBLIC_API_BASE_URL` to environment variables section
- Updated API endpoints documentation
- Added reference to `ENV_SETUP.md`
- Updated project structure to include `lib/api/`

#### `ENV_SETUP.md` (New)
- Comprehensive environment variable guide
- Security best practices
- Troubleshooting section
- Production deployment notes
- Example configurations

## Usage Examples

### Using the API Client

```typescript
import { apiClient, absUrl, getApiBaseUrl } from '@/lib/api';

// Get base URL
const baseUrl = getApiBaseUrl();
console.log(baseUrl); // http://localhost:8000

// Convert relative URL to absolute
const videoUrl = absUrl('/videos/overlay.mp4');
// Returns: http://localhost:8000/videos/overlay.mp4

// Make GET request
const jobs = await apiClient.get('/jobs');

// Make POST request with JSON
const result = await apiClient.post('/analyze', {
  video: 'data...',
  userId: 'user123'
});

// Make POST request with FormData
const formData = new FormData();
formData.append('video', file);
const result = await apiClient.post('/analyze', formData);

// Create custom client
const customClient = createApiClient('https://custom-api.com', 'api-key-123');
```

### Environment Variable Configuration

```env
# Client-side (exposed to browser)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Server-side (not exposed)
AI_BACKEND_URL=http://localhost:8000
AI_BACKEND_API_KEY=your_api_key
```

## Key Differences

### `NEXT_PUBLIC_API_BASE_URL` vs `AI_BACKEND_URL`

| Variable | Scope | Purpose | Used By |
|----------|-------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Client-side | Frontend API calls | React components, browser |
| `AI_BACKEND_URL` | Server-side | Backend processing | API routes, server |

**Why two variables?**
- `NEXT_PUBLIC_API_BASE_URL`: Used by frontend to construct URLs (e.g., overlay videos, PDFs)
- `AI_BACKEND_URL`: Used by server-side API routes to proxy requests to backend
- Separation allows different URLs for frontend and backend if needed

## Next Steps

1. **Set up `.env.local`**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Configure your AI backend**
   - Set `NEXT_PUBLIC_API_BASE_URL` to your backend URL
   - Set `AI_BACKEND_URL` if different from frontend URL
   - Add `AI_BACKEND_API_KEY` if your backend requires authentication

3. **Test the configuration**
   - Restart development server
   - Check that API calls work correctly
   - Verify overlay video URLs resolve properly

## Files Created/Modified

### Created
- `.env.example` - Environment variable template
- `lib/api/client.ts` - API client implementation
- `lib/api/index.ts` - API client exports
- `ENV_SETUP.md` - Environment setup guide
- `API_CLIENT_SETUP.md` - This file

### Modified
- `README.md` - Updated with new environment variables
- `components/dashboard/OverlayPanel.tsx` - Uses API client
- `app/dashboard/analyze/[jobId]/page.tsx` - Uses API client

## Testing

To verify the setup:

1. **Check environment variables load**
   ```typescript
   import { getApiBaseUrl } from '@/lib/api';
   console.log('API Base URL:', getApiBaseUrl());
   ```

2. **Test URL conversion**
   ```typescript
   import { absUrl } from '@/lib/api';
   console.log(absUrl('/videos/test.mp4')); // Should prepend API_BASE
   console.log(absUrl('https://example.com/video.mp4')); // Should return as-is
   ```

3. **Test API client** (if backend is configured)
   ```typescript
   import { apiClient } from '@/lib/api';
   try {
     const health = await apiClient.get('/health');
     console.log('Backend is reachable:', health);
   } catch (error) {
     console.error('Backend not reachable:', error);
   }
   ```
