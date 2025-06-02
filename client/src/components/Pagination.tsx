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
  /** показываем: 1, ..., current-2 … current … current+2, ..., last */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) pages.push(i);
    if (!pages.includes(1))          pages.unshift(1);
    if (!pages.includes(totalPages)) pages.push(totalPages);

    return pages;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      {/* -------- выбор лимита -------- */}
      <label className="text-sm flex items-center gap-2">
        Кол-во на странице:
        <select
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
        >
          {LIMIT_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>

      {/* -------- навигация -------- */}
      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          &laquo;
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          ‹
        </button>

        {pageNumbers.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && pageNumbers[i - 1] + 1 !== p && <span className="px-1">…</span>}
            <button
              onClick={() => onPageChange(p)}
              className={`px-2 py-1 border rounded ${p === page ? 'bg-blue-500 text-white' : ''}`}
            >
              {p}
            </button>
          </React.Fragment>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
};

export default Pagination;