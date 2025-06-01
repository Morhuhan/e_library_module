import React from 'react';
import { PaginationProps } from '../utils/interfaces.tsx';

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page <= 1}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &laquo; Предыдущая
        </button>
        <span className="text-sm">
          Страница {page} из {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(page < totalPages ? page + 1 : page)}
          disabled={page >= totalPages || totalPages === 0}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Следующая &raquo;
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="limit" className="text-sm">
          Кол-во на странице:
        </label>
        <select
          id="limit"
          value={limit}
          onChange={(e) => {
            const newLimit = parseInt(e.target.value, 10) || 10;
            onLimitChange(newLimit);
          }}
          className="border border-gray-300 rounded px-8 py-1 text-sm focus:outline-none"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
        </select>
      </div>
    </div>
  );
};

export default Pagination;