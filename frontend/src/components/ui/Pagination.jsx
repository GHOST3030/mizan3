export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.pages <= 1) return null;

  const { page, pages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pagesArr = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  if (start > 1) pagesArr.push(1);
  if (start > 2) pagesArr.push('...');
  for (let i = start; i <= end; i++) pagesArr.push(i);
  if (end < pages - 1) pagesArr.push('...');
  if (end < pages) pagesArr.push(pages);

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-gray-500 dark:text-gray-400">
        {from}–{to} من {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
          السابق
        </button>
        {pagesArr.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-gray-400 dark:text-gray-500">...</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-sm font-medium transition ${p === page ? 'bg-blue-600 text-white dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
          className="px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
          التالي
        </button>
      </div>
    </div>
  );
}