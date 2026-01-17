'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import { Upload, X, CheckCircle } from 'lucide-react';

interface UploadCardProps {
  label: string;
  hint: string;
  file: File | null;
  setFile: (f: File | null) => void;
  busy: boolean;
  validate: (f: File) => Promise<{ ok: true } | { ok: false; message: string }>;
}

const MAX_UPLOAD_BYTES = 400 * 1024 * 1024; // 400MB
const MAX_VIDEO_SECONDS = 70;

function humanFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      v.removeAttribute('src');
      v.load();
    };

    v.onloadedmetadata = () => {
      const dur = Number(v.duration);
      cleanup();
      if (!Number.isFinite(dur) || dur <= 0) reject(new Error('Could not read video duration'));
      else resolve(dur);
    };

    v.onerror = () => {
      cleanup();
      reject(new Error('Could not read video metadata'));
    };
  });
}

async function validateUploadFile(file: File): Promise<{ ok: true } | { ok: false; message: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `File too large. Max is ${humanFileSize(MAX_UPLOAD_BYTES)}. (Yours is ${humanFileSize(file.size)})`,
    };
  }

  try {
    const dur = await getVideoDurationSeconds(file);
    if (dur > MAX_VIDEO_SECONDS + 0.05) {
      return { ok: false, message: `Video too long (${dur.toFixed(1)}s). Max is ${MAX_VIDEO_SECONDS} seconds.` };
    }
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Could not read video duration.' };
  }

  return { ok: true };
}

export default function UploadCard({ label, hint, file, setFile, busy, validate }: UploadCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function acceptFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];

    setErr('');

    const verdict = await validate(f);
    if (!verdict.ok) {
      setFile(null);
      setErr(verdict.message);
      return;
    }

    setFile(f);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900">{label}</div>
          <div className="text-xs text-gray-500 mt-1">{hint}</div>
        </div>
        <div>
          {file ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              Ready
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              Optional
            </span>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mov,.mp4"
        disabled={busy}
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          await acceptFiles(files);
          // Reset input value to allow selecting the same file again
          // Use the ref to ensure we have a valid reference
          if (inputRef.current) {
            inputRef.current.value = '';
          }
        }}
      />

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-purple-500 bg-purple-50'
            : file
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
        onClick={() => !busy && pick()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!busy) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (busy) return;
          acceptFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
      >
        {file ? (
          <div className="space-y-3">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
            <div>
              <div className="font-semibold text-gray-900 truncate">{file.name}</div>
              <div className="text-xs text-gray-500">{humanFileSize(file.size)}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(ev) => {
                ev.stopPropagation();
                setFile(null);
                setErr('');
              }}
              disabled={busy}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="h-8 w-8 text-gray-400 mx-auto" />
            <div>
              <div className="font-semibold text-gray-900">Drag and drop a video</div>
              <div className="text-xs text-gray-500 mt-1">
                or click to select (.mov or .mp4) — max {MAX_VIDEO_SECONDS}s, {humanFileSize(MAX_UPLOAD_BYTES)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                pick();
              }}
              disabled={busy}
            >
              Choose video
            </Button>
            <div className="text-xs text-gray-500">Tip: include a second before you start aiming</div>
          </div>
        )}
      </div>

      {err ? (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {err}
        </div>
      ) : null}
    </div>
  );
}

// Export the validation function for use elsewhere
export { validateUploadFile, humanFileSize };
