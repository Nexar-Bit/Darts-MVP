'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LazyVideoPlayer = dynamic(() => import('./VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading video...</span>
      </div>
    </div>
  ),
});

export default LazyVideoPlayer;
