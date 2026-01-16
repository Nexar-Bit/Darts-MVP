'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { uploadVideo, getJobStatus, getUserJobs, type JobStatus, type JobListItem } from '@/lib/api';
import { formatError, getUserErrorMessage } from '@/lib/utils/errorHandler';
import { retry } from '@/lib/utils/retry';

/**
 * Analysis state type
 */
export type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';

/**
 * Progress message type
 */
export type ProgressMessage =
  | 'Uploading video...'
  | 'Processing video analysis...'
  | 'Generating coaching plan...'
  | 'Analysis complete!'
  | `Analysis failed: ${string}`;

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  jobId: string;
  status: JobStatus['status'];
  result?: any;
  error?: string;
  createdAt: number;
}

/**
 * Hook return type
 */
export interface UseAnalysisReturn {
  // State
  state: AnalysisState;
  progressMessage: ProgressMessage | null;
  currentJobId: string | null;
  result: AnalysisResult | null;
  history: JobListItem[];
  
  // Actions
  uploadVideos: (sideVideo?: File | null, frontVideo?: File | null) => Promise<void>;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
  refreshHistory: () => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  
  // Status flags
  isIdle: boolean;
  isUploading: boolean;
  isAnalyzing: boolean;
  isCompleted: boolean;
  hasError: boolean;
}

/**
 * Custom hook for managing video analysis workflow
 * 
 * Features:
 * - File upload handling
 * - Automatic polling with 1-second intervals
 * - Progress tracking with clear messages
 * - Result and history management
 * - Automatic cleanup on unmount
 * 
 * @example
 * ```typescript
 * const {
 *   state,
 *   progressMessage,
 *   result,
 *   uploadVideos,
 *   isCompleted
 * } = useAnalysis();
 * 
 * const handleUpload = async () => {
 *   await uploadVideos(sideFile, frontFile);
 * };
 * ```
 */
export function useAnalysis(): UseAnalysisReturn {
  // Core state
  const [state, setState] = useState<AnalysisState>('idle');
  const [progressMessage, setProgressMessage] = useState<ProgressMessage | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<JobListItem[]>([]);
  
  // Polling state
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);
  const lastStageRef = useRef<string | null>(null);

  /**
   * Get progress message based on job status and stage
   */
  const getProgressMessage = useCallback((jobStatus: JobStatus): ProgressMessage => {
    if (jobStatus.status === 'failed') {
      const errorMsg = jobStatus.error?.message || 'Unknown error';
      return `Analysis failed: ${errorMsg}` as ProgressMessage;
    }
    
    if (jobStatus.status === 'done') {
      return 'Analysis complete!';
    }
    
    if (jobStatus.status === 'queued') {
      return 'Processing video analysis...';
    }
    
    // Running state - check stage for more specific message
    if (jobStatus.status === 'running') {
      const stage = jobStatus.stage?.toLowerCase() || '';
      
      // Update last stage to track changes
      if (stage !== lastStageRef.current) {
        lastStageRef.current = stage;
      }
      
      // Check for specific stages
      if (stage.includes('plan') || stage.includes('coaching') || stage.includes('generate')) {
        return 'Generating coaching plan...';
      }
      
      if (stage.includes('analyze') || stage.includes('process') || stage.includes('video')) {
        return 'Processing video analysis...';
      }
      
      // Default running message
      return 'Processing video analysis...';
    }
    
    return 'Processing video analysis...';
  }, []);

  /**
   * Poll job status
   */
  const pollJobStatus = useCallback(async (jobId: string) => {
    if (cancelledRef.current) return;
    
    try {
      const jobStatus = await getJobStatus(jobId);
      
      if (cancelledRef.current) return;
      
      // Update progress message
      const message = getProgressMessage(jobStatus);
      setProgressMessage(message);
      
      // Handle different statuses
      if (jobStatus.status === 'done') {
        // Job completed successfully
        setState('completed');
        setProgressMessage('Analysis complete!');
        
        setResult({
          jobId: jobStatus.job_id,
          status: 'done',
          result: jobStatus.result,
          createdAt: Date.now(),
        });
        
        // Stop polling
        stopPolling();
        
        // Refresh history
        refreshHistory();
      } else if (jobStatus.status === 'failed' || jobStatus.status === 'not_found') {
        // Job failed
        setState('error');
        setProgressMessage(getProgressMessage(jobStatus));
        
        setResult({
          jobId: jobStatus.job_id,
          status: jobStatus.status,
          error: jobStatus.error?.message || 'Job failed or not found',
          createdAt: Date.now(),
        });
        
        // Stop polling
        stopPolling();
      } else {
        // Still processing - continue polling
        setState('analyzing');
        
        // Schedule next poll
        if (!cancelledRef.current) {
          pollingIntervalRef.current = setTimeout(() => {
            pollJobStatus(jobId);
          }, 1000);
        }
      }
    } catch (error) {
      if (cancelledRef.current) return;
      
      console.error('Polling error:', error);
      
      // On error, retry after 1.5 seconds
      if (!cancelledRef.current) {
        pollingIntervalRef.current = setTimeout(() => {
          pollJobStatus(jobId);
        }, 1500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getProgressMessage]);

  /**
   * Start polling for a job
   */
  const startPolling = useCallback((jobId: string) => {
    // Stop any existing polling
    stopPolling();
    
    // Reset cancellation flag
    cancelledRef.current = false;
    
    // Set current job ID
    setCurrentJobId(jobId);
    setState('analyzing');
    setProgressMessage('Processing video analysis...');
    
    // Start polling immediately
    pollJobStatus(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollJobStatus]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    cancelledRef.current = true;
    
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Upload video files
   */
  const uploadVideos = useCallback(async (
    sideVideo?: File | null,
    frontVideo?: File | null
  ): Promise<void> => {
    // Validate inputs
    if (!sideVideo && !frontVideo) {
      throw new Error('At least one video file is required');
    }
    
    // Set uploading state
    setState('uploading');
    setProgressMessage('Uploading video...');
    setResult(null);
    setCurrentJobId(null);
    
    try {
      // Upload videos
      const uploadResult = await uploadVideo(sideVideo || null, frontVideo || null);
      
      // Start polling for the new job
      startPolling(uploadResult.job_id);
    } catch (error: any) {
      // Upload failed - format error for user display
      setState('error');
      const userMessage = getUserErrorMessage(error);
      setProgressMessage(`Analysis failed: ${userMessage}` as ProgressMessage);
      
      setResult({
        jobId: '',
        status: 'failed',
        error: userMessage,
        createdAt: Date.now(),
      });
      
      throw error;
    }
  }, [startPolling]);

  /**
   * Refresh job history with retry
   */
  const refreshHistory = useCallback(async () => {
    try {
      const jobs = await retry(
        () => getUserJobs(undefined, 100),
        {
          maxAttempts: 3,
          delayMs: 1000,
          shouldRetry: (error) => {
            // Retry on network errors, but not on auth errors
            const errorInfo = formatError(error);
            return errorInfo.retryable && errorInfo.category !== 'auth';
          },
        }
      );
      setHistory(jobs);
    } catch (error) {
      console.error('Failed to refresh history:', error);
      // Don't throw - history refresh failure shouldn't break the app
      // But we could show a toast notification here if needed
    }
  }, []);

  /**
   * Clear current result
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setCurrentJobId(null);
    setState('idle');
    setProgressMessage(null);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (state === 'error') {
      setState('idle');
      setProgressMessage(null);
      setResult(null);
    }
  }, [state]);

  /**
   * Load history on mount
   */
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  /**
   * Cleanup polling on unmount
   */
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Computed status flags
  const isIdle = state === 'idle';
  const isUploading = state === 'uploading';
  const isAnalyzing = state === 'analyzing';
  const isCompleted = state === 'completed';
  const hasError = state === 'error';

  return {
    // State
    state,
    progressMessage,
    currentJobId,
    result,
    history,
    
    // Actions
    uploadVideos,
    startPolling,
    stopPolling,
    refreshHistory,
    clearResult,
    clearError,
    
    // Status flags
    isIdle,
    isUploading,
    isAnalyzing,
    isCompleted,
    hasError,
  };
}
