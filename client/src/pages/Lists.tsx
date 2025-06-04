import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import clsx from 'clsx';
import type { Book, PaginatedResponse } from '../utils/interfaces';
import Pagination from '../components/Pagination.tsx';
import httpClient from '../utils/httpsClient.tsx';
import EditBookModal from '../components/EditBookModal.tsx';
import DeleteConfirmModal from '../components/DeleteConfirmModal.tsx';

const LIMIT_OPTIONS = [10, 20, 50] as const;

const COLUMNS = [
  { key: 'localIndex',        label: 'Индекс' },
  { key: 'title',             label: 'Заголовок' },
  { key: 'authors',           label: 'Авторы' },
  { key: 'bookType',          label: 'Тип' },
  { key: 'edit',              label: 'Редакция' },
  { key: 'series',            label: 'Серия' },
  { key: 'physDesc',          label: 'Описание' },
  { key: 'bbks',              label: 'ББК' },
  { key: 'udcs',              label: 'УДК' },
  { key: 'bbkRaws',           label: 'ББК*' },
  { key: 'udcRaws',           label: 'УДК*' },
  { key: 'publicationPlaces', label: 'Издательство' },
] as const;

type SortState = { field: string; order: 'asc' | 'desc' } | null;
const DEBOUNCE_MS = 400;

const Lists: React.FC = () => {
  const [rawSearch, setRawSearch] = useState('');
  const [searchColumn, setSearchColumn] =
    useState<(typeof COLUMNS)[number]['key']>(COLUMNS[0].key);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<typeof LIMIT_OPTIONS[number]>(LIMIT_OPTIONS[0]);
  const [sort, setSort] = useState<SortState>(null);

  const [data, setData] = useState<PaginatedResponse<Book> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [editing, setEditing] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);

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
        const p = new URLSearchParams();
        p.append('search', rawSearch.trim());
        p.append('searchColumn', searchColumn);
        p.append('onlyAvailable', String(onlyAvailable));
        p.append('page', String(page));
        p.append('limit', String(limit));
        if (sort) p.append('sort', `${sort.field}.${sort.order}`);

        const { data } = await httpClient.get<PaginatedResponse<Book>>(
          `/books/paginated?${p.toString()}`,
          { signal: ctrl.signal }
        );
        setData(data);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError('Не удалось загрузить книги. Попробуйте ещё раз.');
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      ctrl.abort();
    };
  }, [rawSearch, searchColumn, onlyAvailable, page, limit, sort, reloadToken]);

  const onSaved = useCallback(() => {
    setEditing(null);
    setReloadToken(v => v + 1);
  }, []);

  const onDeleted = useCallback(() => {
    setDeleting(null);
    setReloadToken(v => v + 1);
  }, []);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const arrowFor = (field: string) => {
    if (!sort || sort.field !== field)
      return { char: '▼', className: 'text-gray-400' };
    return {
      char: sort.order === 'asc' ? '▲' : '▼',
      className: 'text-black',
    };
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Список книг</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <select
          value={searchColumn}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setSearchColumn(e.target.value as typeof searchColumn);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          {COLUMNS.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Введите поисковый запрос…"
          value={rawSearch}
          onChange={e => {
            setRawSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm w-full sm:w-64"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => {
              setOnlyAvailable(e.target.checked);
              setPage(1);
            }}
          />
          Только доступные
        </label>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1200px] text-sm">
          <thead className="bg-gray-100 select-none">
            <tr>
              <th className="p-2 border text-center">#</th>
              {COLUMNS.map(col => {
                const { char, className } = arrowFor(col.key);
                return (
                  <th
                    key={col.key}
                    className="p-2 border cursor-pointer whitespace-nowrap"
                    onClick={() => cycleSortState(col.key)}
                  >
                    {col.label}
                    <span className={clsx('ml-1', className)}>{char}</span>
                  </th>
                );
              })}
              <th className="p-2 border whitespace-nowrap">Действия</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="p-4 text-center">
                  Загрузка…
                </td>
              </tr>
            ) : !data || !data.data.length ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="p-4 text-center">
                  Нет книг
                </td>
              </tr>
            ) : (
              data.data.map((b, i) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {i + 1 + (page - 1) * limit}
                  </td>
                  <td className="p-2 border">{b.localIndex ?? '—'}</td>
                  <td className="p-2 border font-medium">{b.title ?? '—'}</td>
                  <td className="p-2 border">
                    {(b.authors ?? [])
                      .map(a => [a.firstName, a.middleName, a.lastName]
                        .filter(Boolean).join(' '))
                      .join('; ') || '—'}
                  </td>
                  <td className="p-2 border">{b.bookType ?? '—'}</td>
                  <td className="p-2 border">
                    {b.edit ?? '—'}{b.editionStatement ? `, ${b.editionStatement}` : ''}
                  </td>
                  <td className="p-2 border">{b.series ?? '—'}</td>
                  <td className="p-2 border">{b.physDesc ?? '—'}</td>
                  <td className="p-2 border">
                    {(b.bbks ?? []).map(x => x.bbkAbb).join(', ') || '—'}
                  </td>
                  <td className="p-2 border">
                    {(b.udcs ?? []).map(x => x.udcAbb).join(', ') || '—'}
                  </td>
                  <td className="p-2 border">
                    {(b.bbkRaws ?? []).map(x => x.bbkCode).join(', ') || '—'}
                  </td>
                  <td className="p-2 border">
                    {(b.udcRaws ?? []).map(x => x.udcCode).join(', ') || '—'}
                  </td>
                  <td className="p-2 border">
                    {(b.publicationPlaces ?? [])
                      .map(p => [p.city, p.publisher?.name, p.pubYear]
                        .filter(Boolean).join(', '))
                      .join('; ') || '—'}
                  </td>
                  <td className="p-2 border text-center space-x-2 whitespace-nowrap">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => setEditing(b)}
                    >Изм</button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setDeleting(b)}
                    >Удл</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={l => { setLimit(l as typeof limit); setPage(1); }}
      />

      <EditBookModal book={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      <DeleteConfirmModal book={deleting} onClose={() => setDeleting(null)} onDeleted={onDeleted} />
    </div>
  );
};

export default Lists;