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
    <div className="pagination-controls">
      <button
        onClick={() => onPageChange(Math.max(page - 1, 1))}
        disabled={page <= 1}
      >
        &laquo; Предыдущая
      </button>
      <span style={{ margin: '0 8px' }}>
        Страница {page} из {totalPages || 1}
      </span>
      <button
        onClick={() => onPageChange(page < totalPages ? page + 1 : page)}
        disabled={page >= totalPages || totalPages === 0}
      >
        Следующая &raquo;
      </button>
      <select
        value={limit}
        onChange={(e) => {
          const newLimit = parseInt(e.target.value, 10) || 10;
          onLimitChange(newLimit);
        }}
      >
        <option value="5">5 на странице</option>
        <option value="10">10 на странице</option>
        <option value="20">20 на странице</option>
      </select>
    </div>
  );
};

export default Pagination;