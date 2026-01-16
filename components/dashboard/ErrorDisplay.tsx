'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AlertCircle, RefreshCw, XCircle, WifiOff, Server, Shield } from 'lucide-react';
import { formatError, type ErrorInfo } from '@/lib/utils/errorHandler';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
  className?: string;
}

/**
 * Error Display Component
 * 
 * Displays user-friendly error messages with retry options
 * 
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error={apiError}
 *   onRetry={() => refetch()}
 *   title="Failed to load data"
 * />
 * ```
 */
function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  title,
  className = '',
}: ErrorDisplayProps) {
  const errorInfo: ErrorInfo = formatError(error);

  const getIcon = () => {
    switch (errorInfo.category) {
      case 'network':
        return <WifiOff className="h-6 w-6 text-red-600" />;
      case 'server':
        return <Server className="h-6 w-6 text-red-600" />;
      case 'auth':
        return <Shield className="h-6 w-6 text-red-600" />;
      default:
        return <XCircle className="h-6 w-6 text-red-600" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    
    switch (errorInfo.category) {
      case 'network':
        return 'Connection Error';
      case 'server':
        return 'Server Error';
      case 'auth':
        return 'Authentication Error';
      case 'validation':
        return 'Validation Error';
      default:
        return 'Error';
    }
  };

  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {getIcon()}
          <CardTitle className="text-red-900">{getTitle()}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-800 mb-4">{errorInfo.userMessage}</p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4">
            <summary className="text-xs text-red-600 cursor-pointer mb-2">
              Technical Details
            </summary>
            <pre className="text-xs bg-red-100 p-2 rounded overflow-auto">
              {errorInfo.message}
              {errorInfo.statusCode && `\nStatus: ${errorInfo.statusCode}`}
            </pre>
          </details>
        )}

        <div className="flex items-center gap-2">
          {errorInfo.retryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ErrorDisplay);
