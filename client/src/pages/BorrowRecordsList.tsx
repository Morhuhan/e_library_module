// BorrowRecordsList.tsx
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import clsx from 'clsx';
import httpClient from '../utils/httpsClient.tsx';
import type { BorrowRecord, PaginatedResponse } from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';
import { toast } from 'react-toastify';

const LIMIT_OPTIONS = [10, 20, 50] as const;
type SortState = { field: keyof BorrowRecord | string; order: 'asc' | 'desc' } | null;
const DEBOUNCE_MS = 400;

const COLUMNS = [
  { key: 'id', label: 'ID', width: 'w-16' },
  { key: 'title', label: 'Название', width: 'w-48' },
  { key: 'inventoryNo', label: 'Инв. №', width: 'w-28' },
  { key: 'person', label: 'Получатель', width: 'w-48' },
  { key: 'borrowDate', label: 'Дата выдачи', width: 'w-28' },
  { key: 'expectedReturnDate', label: 'Срок возврата', width: 'w-28' },
  { key: 'returnDate', label: 'Дата возврата', width: 'w-28' },
  { key: 'issuedByUser', label: 'Кто выдал', width: 'w-32' },
  { key: 'acceptedByUser', label: 'Кто принял', width: 'w-32' },
] as const;

const BorrowRecordsList: React.FC = () => {
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [rawSearch, setRawSearch] = useState('');
  const [onlyDebts, setOnlyDebts] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<typeof LIMIT_OPTIONS[number]>(LIMIT_OPTIONS[0]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCellClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    const text = e.currentTarget.textContent?.trim() ?? '';
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast.success(`Скопировано: "${text}"`))
      .catch(() => toast.error('Не удалось скопировать'));
  };

  const cycleSortState = useCallback((field: string) => {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      return null;
    });
    setPage(1);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('search', rawSearch.trim());
        params.append('onlyDebts', String(onlyDebts));
        params.append('page', String(page));
        params.append('limit', String(limit));
        if (sort) params.append('sort', `${sort.field}.${sort.order}`);

        const { data } = await httpClient.get<PaginatedResponse<BorrowRecord>>(
          `/borrow-records/paginated?${params.toString()}`,
          { signal: ctrl.signal },
        );
        setBorrowRecords(data.data);
        setTotal(data.total);
      } catch (err: any) {
        if (err.name !== 'CanceledError')
          setError('Не удалось загрузить записи. Попробуйте ещё раз.');
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      ctrl.abort();
    };
  }, [rawSearch, onlyDebts, page, limit, sort, reloadToken]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const arrowFor = (field: string) => {
    if (!sort || sort.field !== field) return { char: '▼', className: 'text-gray-400' };
    return { char: sort.order === 'asc' ? '▲' : '▼', className: 'text-black' };
  };

  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Записи о выдаче книг</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Поиск по фамилии…"
          value={rawSearch}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setRawSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm w-full sm:w-64"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyDebts}
            onChange={e => {
              setOnlyDebts(e.target.checked);
              setPage(1);
            }}
          />
          Только не возвращённые
        </label>
      </div>

      <div className="relative overflow-x-auto border rounded">
        <div className="w-full">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 select-none">
              <tr>
                {COLUMNS.map(col => {
                  const { char, className } = arrowFor(col.key);
                  return (
                    <th
                      key={col.key}
                      className={clsx(
                        'p-2 border cursor-pointer whitespace-nowrap',
                        col.width,
                      )}
                      onClick={() => cycleSortState(col.key)}
                    >
                      {col.label}
                      <span className={clsx('ml-1', className)}>{char}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-4 text-center">
                    Загрузка…
                  </td>
                </tr>
              ) : !borrowRecords.length ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-4 text-center">
                    Нет записей
                  </td>
                </tr>
              ) : (
                borrowRecords.map(rec => {
                  const bookTitle = rec.bookCopy?.book?.title ?? '—';
                  const invNo = rec.bookCopy?.inventoryNo ?? `Экз. #${rec.bookCopy?.id}`;
                  const person = rec.person
                    ? [rec.person.lastName, rec.person.firstName, rec.person.patronymic]
                        .filter(Boolean)
                        .join(' ')
                    : '—';
                  const issuedUser =
                    rec.issuedByUser?.username ?? `ID ${rec.issuedByUser?.id ?? '—'}`;
                  const acceptedUser =
                    rec.acceptedByUser?.username ?? `ID ${rec.acceptedByUser?.id ?? '—'}`;
                  const isReturned = rec.returnDate !== null;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <td
                        className="p-2 border break-words whitespace-normal"
                        onClick={handleCellClick}
                      >
                        {rec.id}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {bookTitle}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {invNo}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {person}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {rec.borrowDate ?? '—'}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {rec.expectedReturnDate ?? '—'}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {rec.returnDate ?? '—'}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {issuedUser}
                      </td>
                      <td className="p-2 border" onClick={handleCellClick}>
                        {isReturned ? acceptedUser : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={l => {
          setLimit(l as typeof limit);
          setPage(1);
        }}
      />
    </div>
  );
};

export default BorrowRecordsList;