'use client';

type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'not_found';

interface StatusBadgeProps {
  status: JobStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = (status: JobStatus) => {
    switch (status) {
      case 'running':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'done':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'failed':
      case 'not_found':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'queued':
      default:
        return 'bg-purple-100 border-purple-300 text-purple-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyles(status)}`}>
      {status}
    </span>
  );
}
