import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let borderClass = 'border-primary/30 bg-surface text-text shadow-sm';
        let iconColor = 'text-primary';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          borderClass = 'border-success/35 bg-surface text-text shadow-sm';
          iconColor = 'text-success';
        } else if (toast.type === 'error') {
          Icon = XCircle;
          borderClass = 'border-danger/35 bg-surface text-text shadow-sm';
          iconColor = 'text-danger';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-warning/35 bg-surface text-text shadow-sm';
          iconColor = 'text-warning';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-[6px] border animate-fade-in transition-all ${borderClass}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-xs leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] text-muted mt-0.5 leading-relaxed break-words font-sans">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted hover:text-text p-0.5 rounded transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
