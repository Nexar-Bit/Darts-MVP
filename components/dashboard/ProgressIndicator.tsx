'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader2, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAnalysis, type AnalysisState } from '@/lib/hooks';
import { useToast } from '@/components/ui/Toast';

interface ProgressIndicatorProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

/**
 * Format elapsed time in a human-readable format
 */
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Progress Indicator Component
 * 
 * Displays analysis progress with status messages, elapsed time, and cancel option.
 * Integrates with useAnalysis hook for state management.
 * 
 * Features:
 * - Status message display (not percentage bars)
 * - Spinner/loading animation
 * - Cancel analysis button
 * - Time elapsed display
 * - Responsive design for all states
 * 
 * @example
 * ```tsx
 * <ProgressIndicator 
 *   onCancel={() => console.log('Cancelled')}
 *   showCancelButton={true}
 * />
 * ```
 */
function ProgressIndicator({
  onCancel,
  showCancelButton = true,
  className = '',
}: ProgressIndicatorProps) {
  const {
    state,
    progressMessage,
    isUploading,
    isAnalyzing,
    isCompleted,
    hasError,
    stopPolling,
    result,
  } = useAnalysis();
  const toast = useToast();

  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const notifiedRef = useRef<{ completed: boolean; error: boolean }>({ completed: false, error: false });

  // Show toast notifications for state changes
  useEffect(() => {
    if (isCompleted && !notifiedRef.current.completed) {
      notifiedRef.current.completed = true;
      toast.success('Analysis completed successfully!', 5000);
    } else if (hasError && result?.error && !notifiedRef.current.error) {
      notifiedRef.current.error = true;
      toast.error(`Analysis failed: ${result.error}`, 8000);
    }
    
    // Reset notification flags when state changes
    if (state === 'idle') {
      notifiedRef.current = { completed: false, error: false };
    }
  }, [isCompleted, hasError, result?.error, state, toast]);

  // Start/stop timer based on state
  useEffect(() => {
    if (isUploading || isAnalyzing) {
      // Start timer
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else {
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Reset timer if idle or completed
      if (state === 'idle' || state === 'completed') {
        startTimeRef.current = null;
        setElapsedTime(0);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isUploading, isAnalyzing, state]);

  const handleCancel = () => {
    stopPolling();
    if (onCancel) {
      onCancel();
    }
  };

  // Don't render if idle
  if (state === 'idle') {
    return null;
  }

  // Determine icon and colors based on state
  const getStateConfig = () => {
    if (isCompleted) {
      return {
        icon: CheckCircle,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-900',
        messageColor: 'text-green-800',
      };
    }
    
    if (hasError) {
      return {
        icon: AlertCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        messageColor: 'text-red-800',
      };
    }
    
    // Uploading or analyzing
    return {
      icon: Loader2,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      messageColor: 'text-blue-800',
    };
  };

  const config = getStateConfig();
  const Icon = config.icon;
  const isSpinning = Icon === Loader2;

  return (
    <Card className={`${config.borderColor} ${config.bgColor} ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon
              className={`h-6 w-6 ${isSpinning ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Status Message */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-semibold ${config.textColor} mb-1`}>
                  {progressMessage || 'Processing...'}
                </h3>
                
                {/* Elapsed Time */}
                {(isUploading || isAnalyzing) && elapsedTime > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      {formatElapsedTime(elapsedTime)} elapsed
                    </span>
                  </div>
                )}

                {/* Additional info for completed state */}
                {isCompleted && (
                  <p className="text-sm text-gray-600 mt-1">
                    Your analysis is ready to view
                  </p>
                )}

                {/* Error details */}
                {hasError && (
                  <p className="text-sm text-red-700 mt-1">
                    Please try again or contact support if the issue persists
                  </p>
                )}
              </div>

              {/* Cancel Button */}
              {showCancelButton && (isUploading || isAnalyzing) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex-shrink-0 border-gray-300 text-gray-700 hover:bg-gray-100"
                  aria-label="Cancel analysis"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ProgressIndicator);
