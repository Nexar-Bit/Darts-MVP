'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-md animate-in slide-in-from-top-5 fade-in-0',
        styles[toast.type]
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-semibold underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

// Hook for using toasts
export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = 5000,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration, action };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const showToastWithAction = React.useCallback((
    message: string,
    action: { label: string; onClick: () => void },
    type: ToastType = 'info',
    duration: number = 10000
  ) => {
    return showToast(message, type, duration, action);
  }, [showToast]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = React.useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]);
  const error = React.useCallback((message: string, duration?: number) => showToast(message, 'error', duration), [showToast]);
  const warning = React.useCallback((message: string, duration?: number) => showToast(message, 'warning', duration), [showToast]);
  const info = React.useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]);

  const successWithAction = React.useCallback((
    message: string,
    action: { label: string; onClick: () => void },
    duration?: number
  ) => showToastWithAction(message, action, 'success', duration), [showToastWithAction]);

  const errorWithAction = React.useCallback((
    message: string,
    action: { label: string; onClick: () => void },
    duration?: number
  ) => showToastWithAction(message, action, 'error', duration), [showToastWithAction]);

  return {
    toasts,
    showToast,
    showToastWithAction,
    removeToast,
    success,
    error,
    warning,
    info,
    successWithAction,
    errorWithAction,
  };
}

export default ToastComponent;
