import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import clsx from 'clsx';
import httpClient from '../utils/httpsClient.tsx';
import type { BorrowRecord, PaginatedResponse } from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';

const LIMIT_OPTIONS = [10, 20, 50] as const;

type SortState =
  | { field: keyof BorrowRecord | string; order: 'asc' | 'desc' }
  | null;

const DEBOUNCE_MS = 400;

const COLUMNS = [
  { key: 'title', label: 'Название', width: 'w-48', searchable: true },
  { key: 'inventoryNo', label: 'Инв. №', width: 'w-28', searchable: true },
  { key: 'person', label: 'Получатель', width: 'w-48', searchable: true },
  { key: 'borrowDate', label: 'Дата выдачи', width: 'w-28', searchable: true },
  { key: 'expectedReturnDate', label: 'Срок возврата', width: 'w-28', searchable: true },
  { key: 'returnDate', label: 'Дата возврата', width: 'w-28', searchable: true },
  { key: 'issuedByUser', label: 'Кто выдал', width: 'w-32', searchable: true },
  { key: 'acceptedByUser', label: 'Кто принял', width: 'w-32', searchable: true },
] as const;

const BorrowRecordsList: React.FC = () => {
  // ────────── state ──────────
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [rawSearch, setRawSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<(typeof COLUMNS)[number]['key']>('person');
  const [onlyDebts, setOnlyDebts] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof LIMIT_OPTIONS)[number]>(LIMIT_OPTIONS[0]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // ────────── helpers ──────────
  const cycleSortState = useCallback((field: string) => {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      return null;
    });
    setPage(1);
  }, []);

  const arrowFor = (field: string) => {
    if (!sort || sort.field !== field)
      return { char: '▼', className: 'text-gray-400' };
    return { char: sort.order === 'asc' ? '▲' : '▼', className: 'text-black' };
  };

  // ────────── data load ──────────
  useEffect(() => {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('search', rawSearch.trim());
        params.append('searchColumn', searchColumn);
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
  }, [rawSearch, searchColumn, onlyDebts, page, limit, sort, reloadToken]);

  // ────────── derived ──────────
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ────────── render ──────────
  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Записи о выдаче книг</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* ───── Фильтры поиска ───── */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <select
          value={searchColumn}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setSearchColumn(e.target.value as typeof searchColumn);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          {COLUMNS.filter(c => c.searchable).map(c => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Введите поисковый запрос…"
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

      {/* ───── Таблица записей ───── */}
      <div className="relative overflow-x-auto border rounded">
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
                  rec.issuedByUser?.username ?? `# ${rec.issuedByUser?.id ?? '—'}`;
                const acceptedUser =
                  rec.acceptedByUser?.username ?? `# ${rec.acceptedByUser?.id ?? '—'}`;
                const isReturned = rec.returnDate !== null;

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-gray-200 transition-colors"
                  >
                    <td className="p-2 border">{bookTitle}</td>
                    <td className="p-2 border">{invNo}</td>
                    <td className="p-2 border">{person}</td>
                    <td className="p-2 border">{rec.borrowDate ?? '—'}</td>
                    <td className="p-2 border">{rec.expectedReturnDate ?? '—'}</td>
                    <td className="p-2 border">{rec.returnDate ?? '—'}</td>
                    <td className="p-2 border">{issuedUser}</td>
                    <td className="p-2 border">{isReturned ? acceptedUser : '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ───── Пагинация ───── */}
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