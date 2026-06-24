import { useEffect, useCallback } from 'react';

export default function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-md', closeOnBackdrop = true }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 animate-fade-in backdrop-blur-[2px]"
      dir="rtl"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} mx-4 dark:bg-gray-800 animate-scale-in max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-lg p-1.5 transition text-sm"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex items-center gap-3 justify-start shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
