'use client';

import { memo, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { absUrl } from '@/lib/api';

interface OverlayPanelProps {
  overlayUrl: string; // legacy fallback
  overlaySideUrl?: string; // new (optional)
  overlayFrontUrl?: string; // new (optional)
}

function OverlayPanel({ overlayUrl, overlaySideUrl, overlayFrontUrl }: OverlayPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasSide = !!overlaySideUrl;
  const hasFront = !!overlayFrontUrl;

  const [tab, setTab] = useState<'side' | 'front'>(() => {
    if (hasSide) return 'side';
    if (hasFront) return 'front';
    return 'side';
  });

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (tab === 'side' && !hasSide && hasFront) setTab('front');
    if (tab === 'front' && !hasFront && hasSide) setTab('side');
  }, [hasSide, hasFront, tab]);

  const src = useMemo(() => (
    tab === 'front'
      ? absUrl(overlayFrontUrl || overlayUrl)
      : absUrl(overlaySideUrl || overlayUrl)
  ), [tab, overlayFrontUrl, overlaySideUrl, overlayUrl]);

  const seek = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, (v.currentTime || 0) + seconds);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    v.addEventListener('play', handlePlay);
    v.addEventListener('pause', handlePause);
    
    return () => {
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('pause', handlePause);
    };
  }, []);

  if (!src) {
    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle>Overlay video</CardTitle>
          <CardDescription>No overlay available for this job.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Overlay video</CardTitle>
        <CardDescription>Use the control buttons to review aim → release.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(hasSide || hasFront) ? (
          <div className="flex gap-2 flex-wrap">
            {hasSide ? (
              <Button
                variant={tab === 'side' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTab('side')}
              >
                Side view
              </Button>
            ) : null}
            {hasFront ? (
              <Button
                variant={tab === 'front' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTab('front')}
              >
                Front view
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-gray-200 bg-gray-900 overflow-hidden">
          <video ref={videoRef} src={src} controls className="w-full" />
        </div>

        <div className="grid grid-cols-5 gap-2">
          <Button variant="outline" size="sm" onClick={() => seek(-2)}>
            <SkipBack className="h-4 w-4 mr-1" />
            -2s
          </Button>
          <Button variant="outline" size="sm" onClick={() => seek(-0.5)}>
            -0.5s
          </Button>
          <Button variant="primary" size="sm" onClick={togglePlay}>
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Play
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => seek(0.5)}>
            +0.5s
          </Button>
          <Button variant="outline" size="sm" onClick={() => seek(2)}>
            +2s
            <SkipForward className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          Tip: +0.5s steps are ideal for checking mechanics frame-to-frame.
        </p>
      </CardContent>
    </Card>
  );
}

export default memo(OverlayPanel);
