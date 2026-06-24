import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-2" dir="rtl">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronLeft className="w-3 h-3" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
