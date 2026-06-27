export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'CheckCircleIcon',
  error: 'XCircleIcon',
  warning: 'ExclamationTriangleIcon',
  info: 'InformationCircleIcon',
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'bg-success-600',
  error: 'bg-danger-600',
  warning: 'bg-warning-600',
  info: 'bg-midblue',
};

let toastCounter = 0;

export function createToast(type: ToastType, message: string, duration = 3000): Toast {
  return {
    id: `toast-${++toastCounter}-${Date.now()}`,
    type,
    message,
    duration,
  };
}

export function getToastIcon(type: ToastType): string {
  return TOAST_ICONS[type];
}

export function getToastColor(type: ToastType): string {
  return TOAST_COLORS[type];
}
