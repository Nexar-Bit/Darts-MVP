'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Play, Pause, Maximize2, Download, Video as VideoIcon } from 'lucide-react';
import { absUrl } from '@/lib/api';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  className?: string;
}

/**
 * Video Player Component
 * 
 * Enhanced video player with controls, fullscreen, download, and thumbnail preview.
 * 
 * @example
 * ```tsx
 * <VideoPlayer
 *   videoUrl="/videos/overlay.mp4"
 *   title="Overlay Video"
 *   thumbnailUrl="/thumbnails/overlay.jpg"
 * />
 * ```
 */
function VideoPlayer({
  videoUrl,
  title = 'Video',
  description,
  thumbnailUrl,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUrl);
  const [error, setError] = useState<string | null>(null);

  const absoluteUrl = useMemo(() => absUrl(videoUrl), [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setShowThumbnail(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleLoadedData = () => {
      setIsLoading(false);
      setShowThumbnail(false);
    };
    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(err => {
        console.error('Error playing video:', err);
        setError('Failed to play video');
      });
    } else {
      video.pause();
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    } else {
      container.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!absoluteUrl) return;
    
    const link = document.createElement('a');
    link.href = absoluteUrl;
    link.download = title.toLowerCase().replace(/\s+/g, '-') + '.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [absoluteUrl, title]);

  if (!absoluteUrl) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No video available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              title="Download video"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative rounded-lg border border-gray-200 bg-gray-900 overflow-hidden"
        >
          {/* Thumbnail Preview */}
          {showThumbnail && thumbnailUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center cursor-pointer z-10"
              style={{ backgroundImage: `url(${absUrl(thumbnailUrl)})` }}
              onClick={() => {
                setShowThumbnail(false);
                videoRef.current?.play();
              }}
            >
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="bg-white/90 rounded-full p-4">
                  <Play className="h-12 w-12 text-gray-900" />
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && !showThumbnail && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                <p className="text-sm text-white">Loading video...</p>
              </div>
            </div>
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            src={absoluteUrl}
            className="w-full"
            controls
            preload="metadata"
            onError={() => setError('Failed to load video')}
          />

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
              <div className="text-center p-4">
                <VideoIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-white">{error}</p>
              </div>
            </div>
          )}

          {/* Custom Play/Pause Overlay */}
          {!isLoading && !error && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <Button
                variant="primary"
                size="sm"
                onClick={togglePlay}
                className="bg-black/70 hover:bg-black/90 border-0"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(VideoPlayer);
