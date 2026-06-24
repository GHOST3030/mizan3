import { useState } from 'react';
import { TableSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

export default function Table({
  columns, data, isLoading, emptyMessage = 'لا توجد بيانات', emptyIcon = '📋',
  rowKey = 'id', renderActions, striped, onRowClick, sortable = false,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  let sortedData = data;
  if (sortable && sortKey && data) {
    sortedData = [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  if (isLoading) return <TableSkeleton rows={5} cols={columns.length + (renderActions ? 1 : 0)} />;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-right px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${sortable ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''} ${col.className || ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {sortable && (
                      <span className={`inline-flex flex-col leading-none text-[8px] ${sortKey === col.key ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>
                        <span className={sortKey === col.key && sortDir === 'asc' ? 'text-blue-500' : ''}>▲</span>
                        <span className={sortKey === col.key && sortDir === 'desc' ? 'text-blue-500' : ''}>▼</span>
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {renderActions && <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/20">
            {sortedData?.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)}>
                  <EmptyState icon={emptyIcon} message={emptyMessage} />
                </td>
              </tr>
            ) : (
              sortedData?.map((row, idx) => (
                <tr
                  key={row[rowKey]}
                  onClick={() => onRowClick?.(row)}
                  className={`transition ${striped && idx % 2 === 1 ? 'bg-gray-50/40 dark:bg-gray-800/30' : ''} hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 text-gray-600 dark:text-gray-300 ${col.tdClass || ''}`}>
                      {col.render ? col.render(row) : row[col.key] ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  ))}
                  {renderActions && <td className="px-4 py-3.5">{renderActions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
