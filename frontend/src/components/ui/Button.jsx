export default function Button({ children, variant = 'primary', size = 'md', loading, disabled, className = '', iconOnly, ...props }) {
  const base = 'rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2 select-none whitespace-nowrap active:scale-[0.97] active:transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md disabled:opacity-40 shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600 focus-visible:ring-blue-500',
    danger:
      'bg-red-600 text-white hover:bg-red-700 hover:shadow-md disabled:opacity-40 shadow-sm dark:bg-red-500 dark:hover:bg-red-600 focus-visible:ring-red-500',
    secondary:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus-visible:ring-gray-400',
    ghost:
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:ring-gray-300',
    success:
      'bg-green-600 text-white hover:bg-green-700 hover:shadow-md disabled:opacity-40 shadow-sm dark:bg-green-500 dark:hover:bg-green-600 focus-visible:ring-green-500',
    warning:
      'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md disabled:opacity-40 shadow-sm dark:bg-amber-500 dark:hover:bg-amber-600 focus-visible:ring-amber-400',
    outline:
      'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:shadow-sm disabled:opacity-40 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 focus-visible:ring-blue-500',
    'outline-danger':
      'border-2 border-red-600 text-red-600 hover:bg-red-50 hover:shadow-sm disabled:opacity-40 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950 focus-visible:ring-red-500',
    'ghost-danger':
      'text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-200 dark:hover:bg-red-950 focus-visible:ring-red-400',
    'ghost-warning':
      'text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-950 focus-visible:ring-amber-400',
    'ghost-success':
      'text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-200 dark:hover:bg-green-950 focus-visible:ring-green-400',
  };

  const sizes = {
    sm: iconOnly ? 'p-1.5 text-xs' : 'px-3 py-1.5 text-xs',
    md: iconOnly ? 'p-2 text-sm' : 'px-4 py-2 text-sm',
    lg: iconOnly ? 'p-3 text-base' : 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
