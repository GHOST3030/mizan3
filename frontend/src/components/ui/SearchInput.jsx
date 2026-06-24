import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'بحث...', debounceMs = 300 }) {
  const [local, setLocal] = useState(value || '');

  useEffect(() => {
    setLocal(value || ''); // eslint-disable-line react-hooks/set-state-in-effect
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== (value || '')) {
        onChange?.(local);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition"
      />
      {local && (
        <button
          onClick={() => { setLocal(''); onChange?.(''); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
