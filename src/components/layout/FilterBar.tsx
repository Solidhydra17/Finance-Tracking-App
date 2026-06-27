import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  id?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, id }) => {
  return (
    <div id={id} className="bg-[var(--card-bg)] border-b border-[var(--card-border)] px-4 py-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {children}
      </div>
    </div>
  );
};

interface FilterChipProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  id?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  children,
  isActive = false,
  onClick,
  id,
}) => {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap
        transition-all duration-200
        ${
          isActive
            ? 'bg-midblue text-white shadow-lg shadow-midblue/20 scale-105'
            : 'bg-[var(--item-bg)] text-[var(--text-muted)] hover:bg-[var(--card-border)]'
        }
      `}
    >
      {children}
    </button>
  );
};
