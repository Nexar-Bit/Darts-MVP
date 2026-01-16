'use client';

import { memo, useCallback, useState } from 'react';
import Button from '@/components/ui/Button';
import { Download, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { downloadPdf, absUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { getUserErrorMessage, formatError } from '@/lib/utils/errorHandler';
import { retry } from '@/lib/utils/retry';

interface PdfDownloadProps {
  pdfUrl: string;
  filename?: string;
  className?: string;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PDF Download Component
 * 
 * Download button for practice plan PDF with progress indicator and open in new tab option.
 * 
 * @example
 * ```tsx
 * <PdfDownload
 *   pdfUrl="/api/pdfs/practice-plan.pdf"
 *   filename="practice-plan.pdf"
 * />
 * ```
 */
function PdfDownload({
  pdfUrl,
  filename,
  className = '',
  variant = 'primary',
  size = 'md',
}: PdfDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const absoluteUrl = absUrl(pdfUrl);

  const handleDownload = useCallback(async () => {
    if (!absoluteUrl) return;
    setDownloading(true);
    setSuccess(false);
    setError(null);

    try {
      // Show progress toast
      const progressToastId = toast.info('Downloading PDF...', 0);

      // Retry download with exponential backoff
      const blob = await retry(
        () => downloadPdf(absoluteUrl),
        {
          maxAttempts: 3,
          delayMs: 1000,
          onRetry: (attempt) => {
            toast.info(`Retrying download (attempt ${attempt + 1}/3)...`, 2000);
          },
        }
      );
      
      // Dismiss progress toast
      toast.removeToast(progressToastId);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'practice-plan.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
      toast.success('PDF downloaded successfully!', 3000);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Download error:', err);
      const userMessage = getUserErrorMessage(err);
      const errorInfo = formatError(err);
      setError(userMessage);
      
      // Show error toast with retry option
      if (errorInfo.retryable) {
        toast.errorWithAction(
          userMessage,
          {
            label: 'Retry',
            onClick: handleDownload,
          },
          10000
        );
      } else {
        toast.error(userMessage, 8000);
      }
      
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloading(false);
    }
  }, [absoluteUrl, filename, toast]);

  const handleOpenInNewTab = useCallback(() => {
    if (!absoluteUrl) return;
    window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
  }, [absoluteUrl]);

  if (!absoluteUrl) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={downloading}
        className="relative"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Downloading...
          </>
        ) : success ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size={size}
        onClick={handleOpenInNewTab}
        title="Open PDF in new tab"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default memo(PdfDownload);
