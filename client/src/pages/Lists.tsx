import React, { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import type { Book, PaginatedResponse } from '../utils/interfaces';
import Pagination from '../components/Pagination.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { useDebounce } from '../utils/useDebounce.ts';
import EditBookModal from '../components/EditBookModal.tsx';
import DeleteConfirmModal from '../components/DeleteConfirmModal.tsx';
const LIMIT_OPTIONS = [10, 20, 50] as const;

const fetcher = (url: string) => httpClient.get(url).then(r => r.data as PaginatedResponse<Book>);

const Lists: React.FC = () => {
  /* ---------------- filters ---------------- */
  const [rawSearch, setRawSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<typeof LIMIT_OPTIONS[number]>(10);

  const search = useDebounce(rawSearch, 300);

  /* ---------------- data ---------------- */
  const queryKey = useMemo(
    () => `/books/paginated?search=${encodeURIComponent(search)}&onlyAvailable=${onlyAvailable}&page=${page}&limit=${limit}`,
    [search, onlyAvailable, page, limit],
  );

  const { data, isLoading, error, mutate } = useSWR<PaginatedResponse<Book>>(queryKey, fetcher);

  /* ---------------- modal state ---------------- */
  const [editing,  setEditing]  = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);

  const onSaved = useCallback(() => {
    setEditing(null);
    mutate(); // рефетч списка
  }, [mutate]);

  const onDeleted = useCallback(() => {
    setDeleting(null);
    mutate();
  }, [mutate]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  /* ---------------- render ---------------- */
  return (
    <div className="container mx-auto px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Список книг</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          Не удалось загрузить книги
        </div>
      )}

      {/* --- filters --- */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Поиск (назв., авторы, индекс)…"
          value={rawSearch}
          onChange={e => { setRawSearch(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm w-full sm:w-64"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => { setOnlyAvailable(e.target.checked); setPage(1); }}
          />
          Только доступные
        </label>
      </div>

      {/* --- table --- */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1200px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              {['#','Индекс','Заголовок','Авторы','Тип','Редакция','Серия','Страницы',
                'ББК','УДК','ББК*','УДК*','Издательство','Действия']
                .map(h => <th key={h} className="p-2 border">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={14} className="p-4 text-center">Загрузка…</td></tr>
            ) : !data || !data.data.length ? (
              <tr><td colSpan={14} className="p-4 text-center">Нет книг</td></tr>
            ) : (
              data.data.map((b, i) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{i + 1 + (page - 1) * limit}</td>
                  <td className="p-2 border">{b.localIndex ?? '—'}</td>
                  <td className="p-2 border font-medium">{b.title ?? '—'}</td>
                  <td className="p-2 border">{(b.authors ?? []).map(a => a.fullName).join('; ') || '—'}</td>
                  <td className="p-2 border">{b.bookType ?? '—'}</td>
                  <td className="p-2 border">
                    {b.edit ?? '—'}{b.editionStatement ? `, ${b.editionStatement}` : ''}
                  </td>
                  <td className="p-2 border">{b.series ?? '—'}</td>
                  <td className="p-2 border">{b.physDesc ?? '—'}</td>
                  <td className="p-2 border">{(b.bbks ?? []).map(x => x.bbkAbb).join(', ') || '—'}</td>
                  <td className="p-2 border">{(b.udcs ?? []).map(x => x.udcAbb).join(', ') || '—'}</td>
                  <td className="p-2 border">{(b.bbkRaws ?? []).map(x => x.bbkCode).join(', ') || '—'}</td>
                  <td className="p-2 border">{(b.udcRaws ?? []).map(x => x.udcCode).join(', ') || '—'}</td>
                  <td className="p-2 border">
                    {(b.publicationPlaces ?? [])
                      .map(p => [p.city, p.publisher?.name, p.pubYear].filter(Boolean).join(', '))
                      .join('; ') || '—'}
                  </td>
                  <td className="p-2 border text-center space-x-2 whitespace-nowrap">
                    <button className="text-blue-600 hover:underline" onClick={() => setEditing(b)}>Изм</button>
                    <button className="text-red-600 hover:underline" onClick={() => setDeleting(b)}>Удл</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- pagination --- */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={l => { setLimit(l as typeof limit); setPage(1); }}
      />

      {/* --- modals --- */}
      <EditBookModal book={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      <DeleteConfirmModal book={deleting} onClose={() => setDeleting(null)} onDeleted={onDeleted} />
    </div>
  );
};

export default Lists;