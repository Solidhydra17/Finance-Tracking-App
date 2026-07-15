import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/store';
import { getToastIcon, getToastColor } from '@/lib/toast';
import { Icon } from './Icon';
import type { Toast } from '@/lib/toast';

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || (toast.type === 'error' ? 5000 : 3000);
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration, toast.type]);

  useEffect(() => {
    if (isExiting) {
      // Wait for animation to finish (400ms match CSS)
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onRemove, toast.id]);

  return (
    <div
      onClick={() => setIsExiting(true)}
      className={`
        ${getToastColor(toast.type)} text-white px-4 py-3 rounded-2xl shadow-xl
        flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity
        border border-white/20 backdrop-blur-sm
        ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}
      `}
    >
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <Icon name={getToastIcon(toast.type)} className="w-5 h-5" />
      </div>
      <span className="flex-1 text-sm font-bold tracking-tight">{toast.message}</span>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-sm px-6">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};
