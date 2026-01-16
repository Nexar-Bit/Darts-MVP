# Custom Hooks Documentation

## `useAnalysis` Hook

A comprehensive React hook for managing the video analysis workflow, including file upload, polling, and state management.

### Features

- ✅ **State Management**: Tracks idle, uploading, analyzing, completed, and error states
- ✅ **File Upload**: Handles side-on and front-on video uploads
- ✅ **Automatic Polling**: Polls job status every 1 second with automatic cleanup
- ✅ **Progress Messages**: Clear, user-friendly progress messages (not percentages)
- ✅ **Result Storage**: Stores analysis results and job history
- ✅ **Error Handling**: Comprehensive error handling with clear messages
- ✅ **Auto Cleanup**: Automatically stops polling on component unmount

### Usage

```typescript
import { useAnalysis } from '@/lib/hooks';

function AnalysisComponent() {
  const {
    state,
    progressMessage,
    result,
    history,
    uploadVideos,
    isCompleted,
    hasError,
  } = useAnalysis();

  const handleUpload = async () => {
    try {
      await uploadVideos(sideFile, frontFile);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      {progressMessage && <p>{progressMessage}</p>}
      {isCompleted && result && <ResultsView result={result.result} />}
      {hasError && <ErrorMessage error={result?.error} />}
    </div>
  );
}
```

### API Reference

#### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `state` | `AnalysisState` | Current state: `'idle' \| 'uploading' \| 'analyzing' \| 'completed' \| 'error'` |
| `progressMessage` | `ProgressMessage \| null` | Current progress message |
| `currentJobId` | `string \| null` | ID of the current job being processed |
| `result` | `AnalysisResult \| null` | Analysis result when completed |
| `history` | `JobListItem[]` | List of all user's analysis jobs |

#### Status Flags

| Property | Type | Description |
|----------|------|-------------|
| `isIdle` | `boolean` | True when state is `'idle'` |
| `isUploading` | `boolean` | True when state is `'uploading'` |
| `isAnalyzing` | `boolean` | True when state is `'analyzing'` |
| `isCompleted` | `boolean` | True when state is `'completed'` |
| `hasError` | `boolean` | True when state is `'error'` |

#### Actions

| Method | Parameters | Description |
|--------|------------|-------------|
| `uploadVideos` | `(sideVideo?, frontVideo?)` | Upload video files and start analysis |
| `startPolling` | `(jobId: string)` | Start polling a specific job |
| `stopPolling` | `()` | Stop current polling |
| `refreshHistory` | `()` | Refresh job history list |
| `clearResult` | `()` | Clear current result and reset to idle |
| `clearError` | `()` | Clear error state |

### Progress Messages

The hook provides clear progress messages based on the job status:

- **"Uploading video..."** - When files are being uploaded
- **"Processing video analysis..."** - When job is queued or running (default)
- **"Generating coaching plan..."** - When job stage indicates plan generation
- **"Analysis complete!"** - When job status is `'done'`
- **"Analysis failed: [reason]"** - When job fails with error message

### State Flow

```
idle → uploading → analyzing → completed
                              ↓
                            error
```

1. **idle**: Initial state, no active operation
2. **uploading**: Files are being uploaded to the server
3. **analyzing**: Job is being processed (polling active)
4. **completed**: Analysis finished successfully
5. **error**: Something went wrong

### Example: Complete Upload Flow

```typescript
'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/hooks';
import { useToast } from '@/components/ui/Toast';

export function VideoUploadForm() {
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const toast = useToast();
  
  const {
    state,
    progressMessage,
    result,
    uploadVideos,
    isUploading,
    isAnalyzing,
    isCompleted,
    hasError,
    clearError,
  } = useAnalysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sideFile && !frontFile) {
      toast.error('Please select at least one video');
      return;
    }

    try {
      await uploadVideos(sideFile, frontFile);
      toast.success('Upload started successfully');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* File inputs */}
      
      {/* Progress indicator */}
      {(isUploading || isAnalyzing) && (
        <div className="progress-indicator">
          <p>{progressMessage}</p>
          {isAnalyzing && <Spinner />}
        </div>
      )}

      {/* Success message */}
      {isCompleted && (
        <div className="success-message">
          <p>{progressMessage}</p>
          <ResultsView result={result?.result} />
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div className="error-message">
          <p>{progressMessage}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isUploading || isAnalyzing}
      >
        {isUploading ? 'Uploading...' : 'Analyze Video'}
      </button>
    </form>
  );
}
```

### Example: Polling Existing Job

```typescript
'use client';

import { useEffect } from 'react';
import { useAnalysis } from '@/lib/hooks';

export function JobStatusView({ jobId }: { jobId: string }) {
  const {
    state,
    progressMessage,
    result,
    startPolling,
    isCompleted,
    hasError,
  } = useAnalysis();

  useEffect(() => {
    // Start polling when component mounts
    startPolling(jobId);

    // Cleanup is handled automatically by the hook
  }, [jobId, startPolling]);

  return (
    <div>
      <p>Status: {progressMessage}</p>
      
      {isCompleted && result && (
        <ResultsView result={result.result} />
      )}
      
      {hasError && (
        <ErrorMessage error={result?.error} />
      )}
    </div>
  );
}
```

### Example: Job History

```typescript
'use client';

import { useEffect } from 'react';
import { useAnalysis } from '@/lib/hooks';

export function JobHistoryList() {
  const {
    history,
    refreshHistory,
    startPolling,
  } = useAnalysis();

  useEffect(() => {
    // Load history on mount
    refreshHistory();
  }, [refreshHistory]);

  return (
    <div>
      <button onClick={refreshHistory}>Refresh</button>
      
      <ul>
        {history.map((job) => (
          <li key={job.job_id}>
            <span>{job.original_filename}</span>
            <span>{job.status}</span>
            <button onClick={() => startPolling(job.job_id)}>
              View Details
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Best Practices

1. **Always handle errors**: Wrap `uploadVideos` in try-catch
2. **Show progress**: Display `progressMessage` to users
3. **Use status flags**: Use `isUploading`, `isAnalyzing`, etc. for UI state
4. **Clean up**: The hook handles cleanup automatically, but you can call `stopPolling()` manually if needed
5. **Refresh history**: Call `refreshHistory()` after operations complete

### TypeScript Types

```typescript
import type {
  AnalysisState,
  ProgressMessage,
  AnalysisResult,
  UseAnalysisReturn,
} from '@/lib/hooks';
```

### Integration with Existing Components

The hook can be easily integrated into existing components:

```typescript
// Before (manual state management)
const [uploading, setUploading] = useState(false);
const [status, setStatus] = useState('idle');
// ... lots of manual polling logic

// After (using hook)
const { state, progressMessage, uploadVideos } = useAnalysis();
```

This simplifies component code and ensures consistent behavior across the application.
