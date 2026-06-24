import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const typeStyles = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-amber-500 text-white',
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

let toastId = 0;
let addToastFn = null;

export function toast(message, type = 'success') {
  if (addToastFn) addToastFn({ id: ++toastId, message, type });
}

function ToastItem({ t, onDismiss }) {
  const Icon = icons[t.type] || icons.info;

  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up flex items-center gap-2.5 min-w-[280px] max-w-sm ${typeStyles[t.type] || typeStyles.info}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{t.message}</span>
      <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 transition shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    addToastFn = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onDismiss={dismiss} />
      ))}
    </div>,
    document.body
  );
}
