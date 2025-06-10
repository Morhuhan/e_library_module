// src/components/Pagination.tsx
import React, { useMemo } from 'react';
import { PaginationProps } from '../utils/interfaces.tsx';

const LIMIT_OPTIONS = [5, 10, 20, 50, 100];

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  /** вычисляем набор отображаемых страниц */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) pages.push(i);
    if (!pages.includes(1)) pages.unshift(1);
    if (!pages.includes(totalPages)) pages.push(totalPages);

    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-white rounded-lg shadow-sm">
      {/* ——— Селектор лимита (виден всегда) ——— */}
      <label className="flex items-center gap-3 text-gray-700 text-sm font-medium">
        <span>Книг на странице:</span>
        <select
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-gray-800 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200 outline-none pr-8"
          aria-label="Выберите количество книг на странице"
        >
          {LIMIT_OPTIONS.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      {/* ——— Навигация (скрыта, если страниц одна) ——— */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Перейти на первую страницу"
          >
            &laquo;
          </button>

          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Предыдущая страница"
          >
            ‹
          </button>

          {pageNumbers.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && pageNumbers[i - 1] + 1 !== p && (
                <span className="px-3 py-2 text-gray-500">…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 ${
                  p === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                }`}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Страница ${p}`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Следующая страница"
          >
            ›
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Перейти на последнюю страницу"
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;