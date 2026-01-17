/**
 * Error Handling Utilities
 * 
 * Provides utilities for handling and formatting errors for user display
 */

import { ApiError } from '@/lib/api/client';

export interface ErrorInfo {
  message: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  category: 'network' | 'validation' | 'server' | 'auth' | 'unknown';
}

/**
 * Categorize and format errors for user display
 */
export function formatError(error: unknown): ErrorInfo {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: error.message,
      userMessage: 'Network connection failed. Please check your internet connection and try again.',
      retryable: true,
      category: 'network',
    };
  }

  // API errors
  if (error instanceof ApiError) {
    const status = error.status;
    
    // Authentication errors
    if (status === 401 || status === 403) {
      return {
        message: error.message,
        userMessage: status === 401
          ? 'Your session has expired. Please log in again.'
          : 'You don\'t have permission to perform this action.',
        retryable: false,
        statusCode: status,
        category: 'auth',
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        message: error.message,
        userMessage: 'Server error occurred. Please try again in a moment.',
        retryable: true,
        statusCode: status,
        category: 'server',
      };
    }

    // Client errors (400-499)
    if (status >= 400) {
      // Special handling for 413 Payload Too Large
      if (status === 413) {
        return {
          message: error.message,
          userMessage: 'File size too large. The total upload size exceeds the server limit. Please try uploading smaller files or compress your videos. Maximum recommended size per video: 100MB.',
          retryable: false,
          statusCode: status,
          category: 'validation',
        };
      }
      
      return {
        message: error.message,
        userMessage: error.message || 'Invalid request. Please check your input and try again.',
        retryable: false,
        statusCode: status,
        category: 'validation',
      };
    }

    // Generic API error
    return {
      message: error.message,
      userMessage: error.message || 'An error occurred. Please try again.',
      retryable: true,
      statusCode: status,
      category: 'server',
    };
  }

  // Generic Error instances
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        message: error.message,
        userMessage: 'Network error. Please check your connection and try again.',
        retryable: true,
        category: 'network',
      };
    }

    if (error.message.includes('timeout')) {
      return {
        message: error.message,
        userMessage: 'Request timed out. Please try again.',
        retryable: true,
        category: 'network',
      };
    }

    return {
      message: error.message,
      userMessage: error.message || 'An unexpected error occurred.',
      retryable: true,
      category: 'unknown',
    };
  }

  // Unknown error type
  return {
    message: 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
    category: 'unknown',
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return formatError(error).retryable;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  return formatError(error).userMessage;
}

/**
 * Get error category
 */
export function getErrorCategory(error: unknown): ErrorInfo['category'] {
  return formatError(error).category;
}
