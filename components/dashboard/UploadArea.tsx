'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, X, Video, FileVideo, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAnalysis } from '@/lib/hooks';
import { validateUploadFile, humanFileSize } from './UploadCard';
import { useToast } from '@/components/ui/Toast';
import { getUserErrorMessage, formatError } from '@/lib/utils/errorHandler';
import ErrorDisplay from './ErrorDisplay';

interface UploadAreaProps {
  onAnalysisStart?: (jobId: string) => void;
  disabled?: boolean;
}

const MAX_UPLOAD_BYTES = 400 * 1024 * 1024; // 400MB
const MAX_VIDEO_SECONDS = 70;

export default function UploadArea({ onAnalysisStart, disabled = false }: UploadAreaProps) {
  const {
    state,
    progressMessage,
    currentJobId,
    uploadVideos,
    isUploading,
    isAnalyzing,
    hasError,
    clearError,
    result,
  } = useAnalysis();
  const toast = useToast();

  // Call onAnalysisStart callback when jobId becomes available
  useEffect(() => {
    if (currentJobId && onAnalysisStart) {
      onAnalysisStart(currentJobId);
    }
  }, [currentJobId, onAnalysisStart]);

  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<{ side?: string; front?: string }>({});
  
  const sideInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const uploadInProgressRef = useRef<boolean>(false);

  const isProcessing = isUploading || isAnalyzing || uploadInProgressRef.current;
  const canUpload = !disabled && !isProcessing && (sideFile || frontFile);

  const handleFileSelect = async (
    file: File,
    type: 'side' | 'front'
  ) => {
    // Clear previous errors
    setErrors(prev => ({ ...prev, [type]: undefined }));

    // Validate file
    const validation = await validateUploadFile(file);
    if (!validation.ok) {
      setErrors(prev => ({ ...prev, [type]: validation.message }));
      if (type === 'side') setSideFile(null);
      if (type === 'front') setFrontFile(null);
      return;
    }

    // Set file
    if (type === 'side') {
      setSideFile(file);
    } else {
      setFrontFile(file);
    }
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'side' | 'front'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileSelect(file, type);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (disabled || isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter(file => 
      file.type.startsWith('video/') || 
      ['.mp4', '.mov', '.avi', '.webm'].some(ext => file.name.toLowerCase().endsWith(ext))
    );

    if (videoFiles.length === 0) {
      setErrors({ side: 'No video files found in drop' });
      return;
    }

    // If multiple files, assign first to side, second to front
    if (videoFiles.length >= 1) {
      await handleFileSelect(videoFiles[0], 'side');
    }
    if (videoFiles.length >= 2) {
      await handleFileSelect(videoFiles[1], 'front');
    }
  };

  const handleRemoveFile = (type: 'side' | 'front') => {
    if (type === 'side') {
      setSideFile(null);
      setErrors(prev => ({ ...prev, side: undefined }));
    } else {
      setFrontFile(null);
      setErrors(prev => ({ ...prev, front: undefined }));
    }
  };

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple simultaneous uploads using ref (more reliable than state)
    if (uploadInProgressRef.current || isProcessing) {
      console.warn('[UploadArea] Upload already in progress, ignoring duplicate request');
      return;
    }
    
    if (!sideFile && !frontFile) {
      setErrors({ side: 'Please select at least one video file' });
      return;
    }
    
    // Mark upload as in progress
    uploadInProgressRef.current = true;

    // Check total file size before upload
    // Vercel serverless functions have a 4.5MB body size limit
    // We'll warn if total exceeds 100MB (conservative estimate)
    const totalSize = (sideFile?.size || 0) + (frontFile?.size || 0);
    const warningSize = 100 * 1024 * 1024; // 100MB
    
    if (totalSize > warningSize) {
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      const shouldContinue = window.confirm(
        `Warning: Your total upload size is ${totalSizeMB}MB. ` +
        `Large files may fail to upload due to server limits. ` +
        `Consider compressing your videos or uploading them separately. ` +
        `\n\nDo you want to continue?`
      );
      
      if (!shouldContinue) {
        return;
      }
    }

    try {
      clearError();
      await uploadVideos(sideFile, frontFile);
      
      // Show success toast
      toast.success('Video upload started successfully!', 3000);
      
      // Clear files after successful upload start
      setSideFile(null);
      setFrontFile(null);
    } catch (error: any) {
      console.error('[UploadArea] Upload error:', error);
      const userMessage = getUserErrorMessage(error);
      const errorInfo = formatError(error);
      
      // Special handling for 413 errors - do NOT retry these
      if (errorInfo.statusCode === 413 || error?.status === 413 || error?.message?.includes('413')) {
        toast.error(
          'File size too large. The server cannot process files this large. ' +
          'Please try compressing your videos or uploading smaller files. ' +
          'Maximum recommended size per video: 100MB.',
          12000
        );
        // Clear files to prevent accidental retry
        setSideFile(null);
        setFrontFile(null);
        uploadInProgressRef.current = false;
        return;
      }
      
      // Show error toast with retry option if retryable (but NOT for 413)
      // Only show retry for network/server errors, not client errors
      if (errorInfo.retryable && errorInfo.category !== 'validation') {
        toast.errorWithAction(
          userMessage,
          {
            label: 'Retry',
            onClick: () => {
              // Only retry if not processing and files still exist
              if (!uploadInProgressRef.current && !isProcessing && (sideFile || frontFile)) {
                handleStartAnalysis(e);
              }
            },
          },
          10000
        );
      } else {
        toast.error(userMessage, 8000);
      }
    } finally {
      // Always reset the upload in progress flag
      uploadInProgressRef.current = false;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Videos</CardTitle>
        <CardDescription>
          Upload side-on and/or front-on videos. If you upload both, we combine them into one analysis.
          <br />
          <span className="text-xs">
            Max {MAX_VIDEO_SECONDS}s per video, max {humanFileSize(MAX_UPLOAD_BYTES)} per video
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleStartAnalysis} className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }
              ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => {
              if (!disabled && !isProcessing && !sideFile) {
                sideInputRef.current?.click();
              }
            }}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 ${dragOver ? 'text-blue-600' : 'text-gray-400'}`} />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drag and drop video files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to select files
            </p>
            <p className="text-xs text-gray-400">
              Supported formats: MP4, MOV, AVI, WebM
            </p>
          </div>

          {/* File Inputs (Hidden) */}
          <input
            ref={sideInputRef}
            type="file"
            accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm"
            onChange={(e) => handleInputChange(e, 'side')}
            disabled={disabled || isProcessing}
            className="hidden"
          />
          <input
            ref={frontInputRef}
            type="file"
            accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm"
            onChange={(e) => handleInputChange(e, 'front')}
            disabled={disabled || isProcessing}
            className="hidden"
          />

          {/* Side Video Preview */}
          {sideFile && (
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Video className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileVideo className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <p className="font-semibold text-gray-900 truncate">
                        Side-on Video
                      </p>
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-600 truncate">{sideFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {humanFileSize(sideFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile('side');
                  }}
                  disabled={isProcessing}
                  className="flex-shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {errors.side && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errors.side}</span>
                </div>
              )}
            </div>
          )}

          {/* Front Video Preview */}
          {frontFile && (
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Video className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileVideo className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <p className="font-semibold text-gray-900 truncate">
                        Front-on Video
                      </p>
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-600 truncate">{frontFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {humanFileSize(frontFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile('front');
                  }}
                  disabled={isProcessing}
                  className="flex-shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {errors.front && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errors.front}</span>
                </div>
              )}
            </div>
          )}

          {/* Manual File Selection Buttons */}
          {!sideFile && !frontFile && (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  sideInputRef.current?.click();
                }}
                disabled={disabled || isProcessing}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Select Side Video
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  frontInputRef.current?.click();
                }}
                disabled={disabled || isProcessing}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Select Front Video
              </Button>
            </div>
          )}

          {/* Progress Message */}
          {(isUploading || isAnalyzing) && progressMessage && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                <p className="text-sm font-medium text-blue-900">{progressMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {hasError && result?.error && (
            <ErrorDisplay
              error={result.error}
              onRetry={() => {
                // Don't retry if already processing or if error is 413 (file too large)
                if (isProcessing) {
                  console.warn('Already processing, ignoring retry');
                  return;
                }
                
                // Check if error is 413 - don't retry these
                const errorStr = String(result.error).toLowerCase();
                if (errorStr.includes('413') || errorStr.includes('too large') || errorStr.includes('payload too large')) {
                  console.warn('413 error detected, not retrying');
                  clearError();
                  return;
                }
                
                clearError();
                if (sideFile || frontFile) {
                  handleStartAnalysis({ preventDefault: () => {} } as React.FormEvent);
                }
              }}
              onDismiss={clearError}
              title="Upload Failed"
            />
          )}

          {/* Start Analysis Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!canUpload}
            isLoading={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {progressMessage || 'Processing...'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Start Analysis
              </>
            )}
          </Button>

          {/* Helper Text */}
          {!sideFile && !frontFile && (
            <p className="text-xs text-gray-500 text-center">
              Tip: Include a second before you start aiming for best results
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
