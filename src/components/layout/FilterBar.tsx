import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children }) => {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
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
}

export const FilterChip: React.FC<FilterChipProps> = ({
  children,
  isActive = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
        transition-colors duration-200
        ${
          isActive
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
    >
      {children}
    </button>
  );
};
