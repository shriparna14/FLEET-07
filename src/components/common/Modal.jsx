import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none">
      {/* Backdrop — dark green-tinted */}
      <div
        className="fixed inset-0 animate-fade-in"
        style={{ backgroundColor: 'rgba(7, 63, 56, 0.45)' }}
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 sm:p-0">
        <div
          className={`relative transform overflow-hidden rounded-[6px] bg-surface text-left
                      border border-border shadow-lg transition-all w-full ${maxWidth} my-8 animate-fade-in`}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border bg-background">
            <div>
              <h3 className="text-sm font-bold text-text uppercase tracking-wider">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-[4px] p-1 text-muted hover:bg-softgreen hover:text-primary transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
