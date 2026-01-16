# API Client Documentation

## Overview

The API client provides a clean, type-safe interface for interacting with the video analysis API. It handles authentication, error handling, and request formatting automatically.

## Installation

The API client is already set up in `lib/api/`. Import functions as needed:

```typescript
import { uploadVideo, getJobStatus, getUserJobs, downloadPdf } from '@/lib/api';
```

## Functions

### `uploadVideo(sideVideo?, frontVideo?, userId?, model?)`

Upload video file(s) for analysis.

**Parameters:**
- `sideVideo` (optional): `File | null` - Side-on video file
- `frontVideo` (optional): `File | null` - Front-on video file
- `userId` (optional): `string` - User ID (retrieved from session if not provided)
- `model` (optional): `string` - AI model to use (default: `'gpt-5-mini'`)

**Returns:** `Promise<{ job_id: string }>`

**Throws:** `ApiError` if upload fails or user is not authenticated

**Example:**
```typescript
try {
  const result = await uploadVideo(sideFile, frontFile);
  console.log('Job created:', result.job_id);
  router.push(`/dashboard/analyze/${result.job_id}`);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Upload failed:', error.message);
    console.error('Status:', error.status);
  }
}
```

---

### `getJobStatus(jobId)`

Get the current status and results of an analysis job.

**Parameters:**
- `jobId`: `string` - The job ID to check

**Returns:** `Promise<JobStatus>`

**JobStatus Interface:**
```typescript
interface JobStatus {
  job_id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'not_found';
  progress?: number;  // 0-1
  stage?: string;
  error?: { message: string };
  result?: any;  // Analysis results when status is 'done'
}
```

**Throws:** `ApiError` if request fails or user is not authenticated

**Example:**
```typescript
try {
  const status = await getJobStatus('job-123');
  
  if (status.status === 'done' && status.result) {
    console.log('Analysis complete:', status.result);
  } else if (status.status === 'running') {
    console.log(`Progress: ${(status.progress || 0) * 100}%`);
  } else if (status.status === 'failed') {
    console.error('Job failed:', status.error?.message);
  }
} catch (error) {
  console.error('Failed to get job status:', error);
}
```

---

### `getUserJobs(userId?, limit?)`

Get a list of the current user's analysis jobs.

**Parameters:**
- `userId` (optional): `string` - User ID (retrieved from session if not provided)
- `limit` (optional): `number` - Maximum number of jobs to return (default: 100, max: 1000)

**Returns:** `Promise<JobListItem[]>`

**JobListItem Interface:**
```typescript
interface JobListItem {
  job_id: string;
  user_id: string;
  created_at_unix: number;
  original_filename?: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress?: number | null;
  stage?: string | null;
  error_message?: string | null;
  throws_detected?: number | null;
  // ... other fields
}
```

**Throws:** `ApiError` if request fails or user is not authenticated

**Example:**
```typescript
try {
  const jobs = await getUserJobs(undefined, 50);
  console.log(`Found ${jobs.length} jobs`);
  
  jobs.forEach(job => {
    console.log(`${job.original_filename}: ${job.status}`);
  });
} catch (error) {
  console.error('Failed to load jobs:', error);
}
```

---

### `downloadPdf(pdfUrl)`

Download a PDF file from a URL.

**Parameters:**
- `pdfUrl`: `string` - URL of the PDF (can be relative or absolute)

**Returns:** `Promise<Blob>`

**Throws:** `ApiError` if download fails

**Example:**
```typescript
try {
  const blob = await downloadPdf('/api/pdfs/practice-plan.pdf');
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'practice-plan.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} catch (error) {
  console.error('Failed to download PDF:', error);
}
```

---

## Error Handling

All functions throw `ApiError` instances on failure. Handle errors like this:

```typescript
import { ApiError } from '@/lib/api';

try {
  const result = await uploadVideo(file);
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API error
    console.error('API Error:', error.message);
    console.error('Status Code:', error.status);
    console.error('Error Data:', error.data);
    
    if (error.status === 401) {
      // User not authenticated
      router.push('/login');
    } else if (error.status === 403) {
      // Permission denied (e.g., usage limit reached)
      toast.error(error.message);
    } else {
      // Other error
      toast.error('An error occurred. Please try again.');
    }
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
  }
}
```

## Authentication

All functions automatically handle authentication by:
1. Getting the current Supabase session
2. Extracting the access token
3. Including it in the `Authorization` header

If the user is not authenticated, functions will throw an `ApiError` with status `401`.

## Usage in React Components

### Example: Upload Component

```typescript
'use client';

import { useState } from 'react';
import { uploadVideo } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export function UploadComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await uploadVideo(file);
      toast.success('Upload successful!');
      router.push(`/dashboard/analyze/${result.job_id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    // ... component JSX
  );
}
```

### Example: Polling Job Status

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getJobStatus, type JobStatus } from '@/lib/api';

export function JobStatusComponent({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<JobStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: NodeJS.Timeout;

    async function poll() {
      try {
        const jobStatus = await getJobStatus(jobId);
        if (cancelled) return;
        
        setStatus(jobStatus);
        
        // Continue polling if not done
        if (jobStatus.status === 'queued' || jobStatus.status === 'running') {
          timer = setTimeout(poll, 1000);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Polling error:', error);
          timer = setTimeout(poll, 1500); // Retry after error
        }
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return (
    // ... render status
  );
}
```

## TypeScript Types

All types are exported from `@/lib/api`:

```typescript
import type {
  JobStatus,
  JobListItem,
  UploadVideoResponse,
} from '@/lib/api';
```

## Best Practices

1. **Always handle errors**: Wrap API calls in try-catch blocks
2. **Check authentication**: Use `isAuthenticated()` helper if needed
3. **Validate inputs**: Check file sizes/types before uploading
4. **Show loading states**: Use loading indicators during API calls
5. **Provide user feedback**: Show success/error messages using toast notifications

## Testing

To test the API client:

```typescript
import { uploadVideo, getJobStatus, getUserJobs } from '@/lib/api';

// Test upload
const result = await uploadVideo(testFile);
console.log('Job ID:', result.job_id);

// Test status
const status = await getJobStatus(result.job_id);
console.log('Status:', status.status);

// Test list
const jobs = await getUserJobs();
console.log('Jobs:', jobs.length);
```
