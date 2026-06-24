export default function Card({ children, title, action, padding = true, className = '', hover = false }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm dark:bg-gray-800 ${padding ? 'p-5' : ''} ${hover ? 'card-hover hover:shadow-md' : ''} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
