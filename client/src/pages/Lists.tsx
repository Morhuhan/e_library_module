import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import clsx from 'clsx';
import type { Book, PaginatedResponse } from '../utils/interfaces';
import Pagination from '../components/Pagination.tsx';
import httpClient from '../utils/httpsClient.tsx';
import EditBookModal from '../components/EditBookModal.tsx';
import DeleteConfirmModal from '../components/DeleteConfirmModal.tsx';

const LIMIT_OPTIONS = [10, 20, 50] as const;

const COLUMNS = [
  { key: 'title', label: 'Название' },
  { key: 'authors', label: 'Авторы' },
  { key: 'bookType', label: 'Тип' },
  { key: 'edit', label: 'Редакция' },
  { key: 'series', label: 'Серия' },
  { key: 'physDesc', label: 'Описание' },
  { key: 'bbks', label: 'ББК' },
  { key: 'udcs', label: 'УДК' },
  { key: 'bbkRaws', label: 'ББК*' },
  { key: 'udcRaws', label: 'УДК*' },
  { key: 'publicationPlaces', label: 'Издательство' },
] as const;

type SortState = { field: string; order: 'asc' | 'desc' } | null;
const DEBOUNCE_MS = 400;

const Lists: React.FC = () => {
  const [rawSearch, setRawSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<(typeof COLUMNS)[number]['key']>(COLUMNS[0].key);
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const cycleSortState = useCallback((field: string) => {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      return null;
    });
    setPage(1);
  }, []);

  const handleRowClick = (bookId: number) => {
    const sel = window.getSelection();
    if (sel && sel.toString().length) return;
    setExpandedId(prev => (prev === bookId ? null : bookId));
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

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
          { signal: ctrl.signal },
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
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-lg font-medium mb-4">Список книг</h2>

      {error && (
        <div className="bg-red-100 border rounded p-3 mb-2 text-red-700 text-sm">
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
          {COLUMNS.map(c => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
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

      {/* ───── Таблица книг ───── */}
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
                  <td colSpan={COLUMNS.length + 1} className="p-4 text-center">
                    Загрузка…
                  </td>
                </tr>
              ) : !data || !data.data.length ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="p-4 text-center">
                    Нет книг
                  </td>
                </tr>
              ) : (
                data.data.map((b) => (
                  <React.Fragment key={b.id}>
                    <tr
                      className="hover:bg-gray-200 cursor-pointer"
                      onClick={() => handleRowClick(b.id)}
                    >
                      <td className="p-2 border font-medium">{b.title ?? '—'}</td>
                      <td className="p-2 border">
                        {(b.authors ?? [])
                          .map(a =>
                            [a.firstName, a.patronymic, a.lastName]
                              .filter(Boolean)
                              .join(' '),
                          )
                          .join('; ') || '—'}
                      </td>
                      <td className="p-2 border">{b.bookType ?? '—'}</td>
                      <td className="p-2 border">
                        {b.edit ?? '—'}
                        {b.editionStatement ? `, ${b.editionStatement}` : ''}
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
                          .map(p =>
                            [p.city, p.publisher?.name, p.pubYear]
                              .filter(Boolean)
                              .join(', '),
                          )
                          .join('; ') || '—'}
                      </td>
                      <td className="p-2 border text-center space-x-2 whitespace-nowrap">
                        <button
                          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-150 ease-in-out text-sm font-medium"
                          onClick={(e) => {
                            stopPropagation(e);
                            setEditing(b);
                          }}
                          title="Изменить книгу"
                        >
                          Изм
                        </button>
                        <button
                          className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 transition duration-150 ease-in-out text-sm font-medium"
                          onClick={(e) => {
                            stopPropagation(e);
                            setDeleting(b);
                          }}
                          title="Удалить книгу"
                        >
                          Удл
                        </button>
                      </td>
                    </tr>
                    {expandedId === b.id && (
                      <tr className="bg-blue-100">
                        <td colSpan={COLUMNS.length + 1} className="p-0">
                          <table className="w-full text-xs">
                            <thead className="bg-blue-200">
                              <tr>
                                <th className="p-2 border w-16">id</th>
                                <th className="p-2 border">Инв. №</th>
                                <th className="p-2 border">Дата пост.</th>
                                <th className="p-2 border">Место хр.</th>
                                <th className="p-2 border">Цена</th>
                                <th className="p-2 border w-28">Статус</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(b.bookCopies ?? []).map(c => {
                                const issued = (c.borrowRecords ?? []).length > 0;
                                return (
                                  <tr key={c.id}>
                                    <td className="p-2 border text-center">{c.id}</td>
                                    <td className="p-2 border">{c.inventoryNo || '—'}</td>
                                    <td className="p-2 border">
                                      {c.receiptDate
                                        ? new Date(c.receiptDate).toLocaleDateString()
                                        : '—'}
                                    </td>
                                    <td className="p-2 border">{c.storagePlace || '—'}</td>
                                    <td className="p-2 border">
                                      {c.price != null ? c.price.toFixed(2) : '—'}
                                    </td>
                                    <td
                                      className={clsx(
                                        'p-2 border text-center',
                                        issued ? 'text-red-600' : 'text-green-600',
                                      )}
                                    >
                                      {issued ? 'выдан' : 'в наличии'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {/* ───── Модальные окна ───── */}
      <EditBookModal
        book={editing}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />
      <DeleteConfirmModal
        book={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onDeleted}
      />
    </div>
  );
};

export default Lists;