export default function PageHeader({ title, description, actions, breadcrumbs, className = '' }) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              {crumb.to ? (
                <a href={crumb.to} className="hover:text-blue-500 dark:hover:text-blue-400 transition">{crumb.label}</a>
              ) : (
                <span className="text-gray-600 dark:text-gray-300">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
          {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
