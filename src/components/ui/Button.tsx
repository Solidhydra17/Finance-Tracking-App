import React, { useState } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const [isGuardActive, setIsGuardActive] = useState(false);
  const isProcessing = isLoading || isGuardActive;

  const variantClasses = {
    primary: 'bg-midblue hover:bg-midblue/90 text-white shadow-lg shadow-midblue/20',
    secondary: 'bg-[var(--item-bg)] hover:bg-[var(--card-border)] text-[var(--text-main)] border border-[var(--card-border)]',
    danger: 'bg-danger-500 hover:bg-danger-600 text-white shadow-lg shadow-danger-500/20',
    ghost: 'bg-transparent hover:bg-[var(--item-bg)] text-[var(--text-main)]',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`
        ui-button
        ${variantClasses[variant]} ${sizeClasses[size]}
        rounded-xl font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
      disabled={disabled || isProcessing}
      onClick={(e) => {
        if (isProcessing) {
          e.preventDefault();
          return;
        }
        if (props.type !== 'submit') {
          setIsGuardActive(true);
          setTimeout(() => setIsGuardActive(false), 500);
        }
        props.onClick?.(e);
      }}
      {...props}
    >
      {isProcessing ? (
        <span className="animate-spin">⏳</span>
      ) : (
        <>
          {leftIcon && <span>{leftIcon}</span>}
          {children}
          {rightIcon && <span>{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
