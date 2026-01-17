'use client';

import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { ApiError } from './client';

/**
 * Job status response interface
 */
export interface JobStatus {
  job_id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'not_found';
  progress?: number;
  stage?: string;
  error?: {
    message: string;
  };
  result?: any;
}

/**
 * Job list item interface
 */
export interface JobListItem {
  job_id: string;
  user_id: string;
  created_at_unix: number;
  original_filename?: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress?: number | null;
  stage?: string | null;
  error_message?: string | null;
  overlay_url?: string | null;
  overlay_side_url?: string | null;
  overlay_front_url?: string | null;
  analysis_url?: string | null;
  practice_plan_url?: string | null;
  practice_plan_txt_url?: string | null;
  practice_plan_pdf_url?: string | null;
  lesson_plan_url?: string | null;
  throws_detected?: number | null;
}

/**
 * Upload video response interface
 */
export interface UploadVideoResponse {
  job_id: string;
}

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string> {
  const supabase = createSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.access_token) {
    throw new ApiError('Not authenticated. Please sign in.', 401);
  }
  
  return session.access_token;
}

/**
 * Make an authenticated request to the Next.js API
 */
async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    
    throw new ApiError(
      errorData.error || errorData.message || 'Request failed',
      response.status,
      errorData
    );
  }

  return response;
}

/**
 * Upload video file(s) for analysis
 * 
 * @param sideVideo - Side-on video file (optional)
 * @param frontVideo - Front-on video file (optional)
 * @param userId - User ID (optional, will be retrieved from session if not provided)
 * @param model - AI model to use (default: 'gpt-5-mini')
 * @returns Promise with job_id
 * 
 * @throws {ApiError} If upload fails or user is not authenticated
 * 
 * @example
 * ```typescript
 * const result = await uploadVideo(sideFile, frontFile);
 * console.log('Job ID:', result.job_id);
 * ```
 */
export async function uploadVideo(
  sideVideo?: File | null,
  frontVideo?: File | null,
  userId?: string,
  model: string = 'gpt-5-mini'
): Promise<UploadVideoResponse> {
  // Validate that at least one video is provided
  if (!sideVideo && !frontVideo) {
    throw new ApiError(
      'At least one video file is required (side_video or front_video)',
      400
    );
  }

  // Create FormData for multipart/form-data upload
  const formData = new FormData();
  
  if (sideVideo) {
    formData.append('side_video', sideVideo);
  }
  
  if (frontVideo) {
    formData.append('front_video', frontVideo);
  }
  
  formData.append('model', model);
  
  if (userId) {
    formData.append('user_id', userId);
  }

  try {
    const response = await authenticatedFetch('/api/analyze', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    // Handle 413 Payload Too Large errors specifically
    if (!response.ok && response.status === 413) {
      const errorData = await response.json().catch(() => ({ 
        error: 'File size too large. The server cannot process files this large.' 
      }));
      throw new ApiError(
        errorData.error || 'File size too large. Please try smaller files or compress your videos.',
        413,
        errorData
      );
    }

    const data = await response.json();
    
    if (!data.job_id) {
      throw new ApiError('No job_id returned from server', 500, data);
    }

    return { job_id: data.job_id };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Upload failed',
      0,
      error
    );
  }
}

/**
 * Get job status and results
 * 
 * @param jobId - Job ID to check
 * @returns Promise with job status and optional result data
 * 
 * @throws {ApiError} If request fails or user is not authenticated
 * 
 * @example
 * ```typescript
 * const status = await getJobStatus('job-123');
 * console.log('Status:', status.status);
 * if (status.result) {
 *   console.log('Results:', status.result);
 * }
 * ```
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  if (!jobId) {
    throw new ApiError('Job ID is required', 400);
  }

  try {
    const response = await authenticatedFetch(`/api/jobs/${jobId}`);
    const data = await response.json();
    
    return {
      job_id: data.job_id || jobId,
      status: data.status || 'not_found',
      progress: data.progress,
      stage: data.stage,
      error: data.error,
      result: data.result,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to get job status',
      0,
      error
    );
  }
}

/**
 * Get user's analysis jobs
 * 
 * @param userId - User ID (optional, will be retrieved from session if not provided)
 * @param limit - Maximum number of jobs to return (default: 100)
 * @returns Promise with array of job list items
 * 
 * @throws {ApiError} If request fails or user is not authenticated
 * 
 * @example
 * ```typescript
 * const jobs = await getUserJobs(undefined, 50);
 * console.log(`Found ${jobs.length} jobs`);
 * ```
 */
export async function getUserJobs(
  userId?: string,
  limit: number = 100
): Promise<JobListItem[]> {
  if (limit < 1 || limit > 1000) {
    throw new ApiError('Limit must be between 1 and 1000', 400);
  }

  try {
    const response = await authenticatedFetch(`/api/jobs?limit=${limit}`);
    const data = await response.json();
    
    return data.jobs || [];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to get user jobs',
      0,
      error
    );
  }
}

/**
 * Download PDF file from URL
 * 
 * @param pdfUrl - URL of the PDF file (can be relative or absolute)
 * @returns Promise with PDF Blob
 * 
 * @throws {ApiError} If download fails
 * 
 * @example
 * ```typescript
 * const blob = await downloadPdf('/api/pdfs/practice-plan.pdf');
 * const url = URL.createObjectURL(blob);
 * window.open(url);
 * ```
 */
export async function downloadPdf(pdfUrl: string): Promise<Blob> {
  if (!pdfUrl) {
    throw new ApiError('PDF URL is required', 400);
  }

  // Convert relative URL to absolute if needed
  let absoluteUrl = pdfUrl;
  if (!pdfUrl.startsWith('http')) {
    // If relative URL, prepend current origin
    absoluteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${pdfUrl}`;
  }

  try {
    // For PDF downloads, we might need authentication
    // Try to get token and include it if available
    let headers: HeadersInit = {};
    
    try {
      const token = await getAuthToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // If auth fails, try without auth (public PDF)
    }

    const response = await fetch(absoluteUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to download PDF: ${response.statusText}`,
        response.status
      );
    }

    // Verify content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/pdf')) {
      console.warn(`Expected PDF but got ${contentType}`);
    }

    return await response.blob();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to download PDF',
      0,
      error
    );
  }
}

/**
 * Helper function to check if user is authenticated
 * 
 * @returns Promise<boolean> - True if user has valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getAuthToken();
    return true;
  } catch {
    return false;
  }
}
