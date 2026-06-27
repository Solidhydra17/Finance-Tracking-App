import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  return (
    <div className="ui-input-wrapper w-full">
      {label && (
        <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {leftIcon}
          </span>
        )}
        <input
          className={`
            w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)]
            bg-[var(--card-bg)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]
            focus:outline-none focus:ring-2 focus:ring-midblue focus:border-transparent
            transition-all duration-200
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-danger-500 focus:ring-danger-500' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="ui-select-wrapper w-full">
      {label && (
        <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5 ml-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)]
          bg-[var(--card-bg)] text-[var(--text-main)]
          focus:outline-none focus:ring-2 focus:ring-midblue focus:border-transparent
          transition-all duration-200
          ${error ? 'border-danger-500 focus:ring-danger-500' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="ui-textarea-wrapper w-full">
      {label && (
        <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5 ml-1">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)]
          bg-[var(--card-bg)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]
          focus:outline-none focus:ring-2 focus:ring-midblue focus:border-transparent
          transition-all duration-200 resize-none
          ${error ? 'border-danger-500 focus:ring-danger-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
    </div>
  );
};
