'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import Button from '@/components/ui/Button';

interface JobListItem {
  job_id: string;
  user_id: string;
  created_at_unix: number;
  original_filename?: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress?: number | null;
  stage?: string | null;
  error_message?: string | null;
  overlay_url?: string | null;
  analysis_url?: string | null;
  practice_plan_url?: string | null;
  practice_plan_txt_url?: string | null;
  lesson_plan_url?: string | null;
  throws_detected?: number | null;
}

interface RecentResultsProps {
  jobs: JobListItem[];
  onOpen: (jobId: string) => void;
}

function fmtDate(unixSeconds: number) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString();
}

export default function RecentResults({ jobs, onOpen }: RecentResultsProps) {
  const recent = (jobs || []).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent results</CardTitle>
          <div className="text-xs text-gray-500">Last {recent.length}</div>
        </div>
      </CardHeader>
      <CardContent>
        {!recent.length ? (
          <EmptyState 
            title="No results yet" 
            subtitle="Upload a video to generate your first coaching report." 
          />
        ) : (
          <div className="grid gap-2">
            {recent.map((j) => (
              <button
                key={j.job_id}
                type="button"
                className="text-left w-full border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                onClick={() => onOpen(j.job_id)}
                title="Open this job"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 truncate">
                      {j.original_filename || '(unknown)'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last analysed: {fmtDate(j.created_at_unix)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={j.status} />
                    {typeof j.throws_detected === 'number' ? (
                      <span className="text-xs text-gray-500 min-w-[60px] text-right">
                        {j.throws_detected} throws
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
