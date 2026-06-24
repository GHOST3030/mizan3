export default function EmptyState({ icon = '📋', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <span className="text-5xl mb-4">{icon}</span>
      {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">{title}</h3>}
      {message && <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 text-center max-w-sm">{message}</p>}
      {action && action}
    </div>
  );
}
