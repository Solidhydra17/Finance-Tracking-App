import React from 'react';

interface DayPickerProps {
  selected: number[]; // array of 0-6
  onChange: (days: number[]) => void;
  label?: string;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const DayPicker: React.FC<DayPickerProps> = ({ selected, onChange, label }) => {
  const toggleDay = (dayIndex: number) => {
    if (selected.includes(dayIndex)) {
      if (selected.length > 1) {
        onChange(selected.filter((d) => d !== dayIndex).sort());
      }
    } else {
      onChange([...selected, dayIndex].sort());
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-[var(--text-muted)] mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="flex justify-between items-center w-full gap-1">
        {DAY_LABELS.map((day, index) => {
          const isSelected = selected.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => toggleDay(index)}
              className={`w-10 h-10 rounded-full font-bold text-sm transition-all active:scale-95 flex items-center justify-center
                ${isSelected 
                  ? 'bg-midblue text-white shadow-md' 
                  : 'bg-[var(--item-bg)] text-[var(--text-muted)] border border-[var(--card-border)]'
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
