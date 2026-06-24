const styles = {
  success: {
    bg: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
    text: 'text-red-600 dark:text-red-300',
    icon: '✕',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    icon: '⚠',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'ℹ',
  },
};

export default function Alert({ type = 'info', children, onClose, className = '' }) {
  const s = styles[type] || styles.info;

  return (
    <div className={`border rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${s.bg} ${s.text} ${className}`}>
      <span className="font-bold">{s.icon}</span>
      <span className="flex-1">{children}</span>
      {onClose && (
        <button onClick={onClose} className="hover:opacity-70 text-lg leading-none">&times;</button>
      )}
    </div>
  );
}
