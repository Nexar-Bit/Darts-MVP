'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export default function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="flex justify-center mb-4">
        <div className="relative w-32 h-16">
          <div className="absolute w-12 h-12 bg-purple-200 rounded-full opacity-60 left-2 top-1" />
          <div className="absolute w-10 h-10 bg-purple-300 rounded-full opacity-60 left-12 top-2" />
          <div className="absolute w-8 h-8 bg-purple-400 rounded-full opacity-60 left-20 top-3" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{subtitle}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
