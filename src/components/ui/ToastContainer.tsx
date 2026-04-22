import React from 'react';
import { useUIStore } from '@/store';
import { getToastIcon, getToastColor } from '@/lib/toast';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${getToastColor(toast.type)} text-white px-4 py-3 rounded-xl shadow-medium
            flex items-center gap-3 animate-[slideDown_0.3s_ease-out]
            cursor-pointer hover:opacity-90 transition-opacity
          `}
          onClick={() => removeToast(toast.id)}
        >
          <span className="text-lg">{getToastIcon(toast.type)}</span>
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
