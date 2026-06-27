import React from 'react';

interface ProgressBarProps {
  percentage: number;
  height?: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, height = 8, className = '' }) => {
  // Ensure we cap the visible width at 100%
  const widthPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // Determine RAG color based on percentage
  let colorClass = 'bg-success-500'; // Green: 0-80%
  if (percentage > 80 && percentage <= 100) {
    colorClass = 'bg-warning-500'; // Amber: 80-100%
  } else if (percentage > 100) {
    colorClass = 'bg-danger-500'; // Red: > 100%
  }

  return (
    <div className={`w-full bg-[var(--item-bg)] rounded-full overflow-hidden border border-[var(--card-border)] ${className}`} style={{ height }}>
      <div 
        className={`h-full transition-all duration-300 ease-out ${colorClass}`}
        style={{ width: `${widthPercentage}%` }}
      />
    </div>
  );
};
