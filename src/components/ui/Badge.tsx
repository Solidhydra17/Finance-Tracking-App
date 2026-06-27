import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
}) => {
  const variantClasses = {
    default: 'bg-[var(--item-bg)] text-[var(--text-main)] border border-[var(--card-border)]',
    success: 'bg-success-500/10 text-success-600 dark:text-success-400',
    warning: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
    danger: 'bg-danger-500/10 text-danger-600 dark:text-danger-400',
    info: 'bg-midblue/10 text-midblue dark:text-white',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
      `}
    >
      {children}
    </span>
  );
};
