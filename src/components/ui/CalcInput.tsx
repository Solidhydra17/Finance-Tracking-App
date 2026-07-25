import React, { useState } from 'react';

interface CalcInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  currencySymbol?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const CalcInput: React.FC<CalcInputProps> = ({
  label,
  value,
  onChange,
  currencySymbol,
  placeholder,
  required,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState(value || '');

  const handleOpen = () => {
    setExpression(value || '');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const append = (char: string) => {
    if (expression === 'Error') {
      setExpression(char);
    } else {
      setExpression((prev) => prev + char);
    }
  };

  const clear = () => setExpression('');

  const backspace = () => {
    if (expression === 'Error') {
      setExpression('');
    } else {
      setExpression((prev) => prev.slice(0, -1));
    }
  };

  const evaluate = () => {
    if (!expression || expression === 'Error') return;

    // Check if it's already a plain number (no operators)
    if (/^\d*\.?\d*$/.test(expression)) {
      const parsed = parseFloat(expression);
      if (!isNaN(parsed)) {
        onChange(parsed.toString());
        setIsOpen(false);
        return;
      }
    }

    try {
      const sanitized = expression.replace(/×/g, '*').replace(/÷/g, '/');
      const result = Function('"use strict"; return (' + sanitized + ')')();

      if (typeof result !== 'number' || !isFinite(result)) {
        setExpression('Error');
        return;
      }

      let finalResult = result < 0 ? 0 : result;
      finalResult = Math.round(finalResult * 100) / 100;

      onChange(finalResult.toFixed(2));
      setIsOpen(false);
    } catch (e) {
      setExpression('Error');
    }
  };

  return (
    <>
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5 ml-1">
            {label} {required && <span className="text-danger-500">*</span>}
          </label>
        )}
        <div
          onClick={handleOpen}
          className={`flex items-center w-full h-[56px] px-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-midblue/20 transition-all cursor-pointer ${className}`}
        >
          {currencySymbol && (
            <span className="text-[var(--text-muted)] font-bold mr-3">{currencySymbol}</span>
          )}
          <span className={`flex-1 overflow-hidden whitespace-nowrap text-ellipsis ${value ? 'text-[var(--text-main)] font-bold' : 'text-gray-400'}`}>
            {value || placeholder || ''}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 z-[59]" onClick={handleClose} />
          
          <div className="relative z-[60] bg-[var(--card-bg)] rounded-t-3xl border-t border-[var(--card-border)] p-4 pb-8 animate-slide-up">
            <div className="w-full bg-[var(--item-bg)] rounded-2xl p-4 mb-4 overflow-x-auto text-right text-2xl font-bold text-[var(--text-main)] min-h-[64px] flex items-center justify-end">
              {expression || '0'}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={clear} className="bg-[var(--item-bg)] text-danger-500 font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">C</button>
              <button type="button" onClick={backspace} className="bg-[var(--item-bg)] text-midblue font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">⌫</button>
              <button type="button" onClick={() => append('÷')} className="bg-[var(--item-bg)] text-midblue font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">÷</button>
              <button type="button" onClick={() => append('×')} className="bg-[var(--item-bg)] text-midblue font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">×</button>

              <button type="button" onClick={() => append('7')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">7</button>
              <button type="button" onClick={() => append('8')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">8</button>
              <button type="button" onClick={() => append('9')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">9</button>
              <button type="button" onClick={() => append('-')} className="bg-[var(--item-bg)] text-midblue font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">−</button>

              <button type="button" onClick={() => append('4')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">4</button>
              <button type="button" onClick={() => append('5')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">5</button>
              <button type="button" onClick={() => append('6')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">6</button>
              <button type="button" onClick={() => append('+')} className="bg-[var(--item-bg)] text-midblue font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">+</button>

              <button type="button" onClick={() => append('1')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">1</button>
              <button type="button" onClick={() => append('2')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">2</button>
              <button type="button" onClick={() => append('3')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">3</button>
              <div className="h-14"></div> {/* empty */}

              <button type="button" onClick={() => append('0')} className="col-span-2 bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">0</button>
              <button type="button" onClick={() => append('.')} className="bg-[var(--item-bg)] text-[var(--text-main)] font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">.</button>
              <button type="button" onClick={evaluate} className="bg-midblue text-white font-bold rounded-xl h-14 text-xl active:scale-95 transition-all">✓</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
