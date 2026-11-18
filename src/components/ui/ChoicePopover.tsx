import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export type ChoiceOption = {
  value: string;
  label: string;
};

type ChoicePopoverProps = {
  value: string;
  placeholder: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  id?: string;
};

type Place = {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
};

export const ChoicePopover: React.FC<ChoicePopoverProps> = ({
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  allowEmpty = false,
  emptyLabel = 'None',
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [place, setPlace] = useState<Place | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const selected = options.find((option) => option.value === value);
  const display = selected?.label || (allowEmpty && value === '' ? emptyLabel : '');

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    const placePanel = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(rect.width, window.innerWidth - 32);
      const left = Math.min(Math.max(16, rect.right - width), window.innerWidth - width - 16);
      const estimated = Math.min(360, 88 + (options.length + (allowEmpty ? 1 : 0)) * 44);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimated && rect.top > spaceBelow;
      setPlace({
        top: openUp ? rect.top - 10 : rect.bottom + 10,
        left,
        width,
        openUp,
      });
    };
    placePanel();
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey, true);
    window.addEventListener('resize', placePanel);
    window.addEventListener('scroll', placePanel, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('resize', placePanel);
      window.removeEventListener('scroll', placePanel, true);
    };
  }, [open, value, options.length, allowEmpty]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((current) => !current);
  };

  const handleDone = () => {
    if (draft !== '' || allowEmpty) onChange(draft);
    setOpen(false);
  };

  const choices = [
    ...(allowEmpty ? [{ value: '', label: emptyLabel }] : []),
    ...options,
  ];

  return (
    <div className="relative">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={handleToggle}
        className={`flex h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 bg-[var(--item-bg)] px-4 text-left text-lg font-bold transition-all ${
          open ? 'border-midblue' : 'border-transparent'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span id={labelId} className={`min-w-0 truncate ${display ? 'text-[var(--text-main)]' : 'font-medium text-[var(--text-muted)]'}`}>
          {display || placeholder}
        </span>
        <Icon name="ChevronUpDownIcon" className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
      </button>
      {open && place && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={placeholder}
          className="fixed z-[70]"
          style={{
            top: place.top,
            left: place.left,
            width: place.width,
            transform: place.openUp ? 'translateY(-100%)' : undefined,
          }}
        >
          <span
            className={`absolute right-4 h-3 w-3 rotate-45 border-[var(--card-border)] bg-[var(--card-bg)] ${
              place.openUp ? '-bottom-1.5 border-b border-r' : '-top-1.5 border-l border-t'
            }`}
          />
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-[0_16px_40px_rgba(17,24,39,0.16)]">
            <div className="max-h-64 overflow-y-auto">
              {choices.length === 0 && (
                <p className="px-2 py-3 text-sm font-medium text-[var(--text-muted)]">Nothing to choose</p>
              )}
              {choices.map((option) => {
                const checked = draft === option.value;
                return (
                  <button
                    key={option.value || 'empty'}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setDraft(option.value)}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left text-sm ${
                      checked ? 'font-bold text-midblue' : 'font-medium text-[var(--text-muted)]'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                      checked ? 'border-midblue bg-midblue text-white' : 'border-[var(--card-border)] bg-transparent'
                    }`}>
                      {checked && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                          <path d="M2.5 6.2 4.8 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleDone}
              className="mt-1 min-h-11 w-full text-sm font-black text-midblue"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
