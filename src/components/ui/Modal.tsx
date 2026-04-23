import React, { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  position?: 'center' | 'bottom';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  position = 'center',
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300); // Matches animation duration
      return () => clearTimeout(timer);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, shouldRender, handleEscape]);

  if (!shouldRender) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return createPortal(
    <div id="ui-modal-root" className={`fixed inset-0 z-50 flex justify-center ${position === 'bottom' ? 'items-end' : 'items-end sm:items-center'}`}>
      {/* Backdrop */}
      <div
        className={`
          ui-modal-backdrop
          absolute inset-0 bg-black/50 backdrop-blur-sm 
          ${isClosing ? 'animate-[fadeOut_0.3s_ease-in-out] fill-mode-forwards' : 'animate-[fadeIn_0.2s_ease-out]'}
        `}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        className={`
          ui-modal-container
          relative bg-white rounded-t-3xl ${position === 'center' ? 'sm:rounded-2xl' : ''} shadow-hard
          w-full ${sizeClasses[size]} max-h-[90vh] overflow-auto
          ${isClosing ? 'animate-[slideOutDown_0.3s_ease-in-out] fill-mode-forwards' : 'animate-[slideUp_0.3s_ease-out]'}
        `}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};
