import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import clsx from 'clsx';
import { Book, Person, PaginatedResponse, Author, Bbk, Udc } from '../utils/interfaces.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { toast } from 'react-toastify';
import Pagination from '../components/Pagination.tsx';
import BorrowDetailsModal from '../components/BorrowDetailsModal.tsx';

type ActionType = 'borrow' | 'return';

/* ─── Колонки, по которым можно искать ─── */
const COLUMNS = [
  { key: 'localIndex', label: 'Индекс' },
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
type SearchColumn = (typeof COLUMNS)[number]['key'];

/* ─── Настройка дебаунса ─── */
const DEBOUNCE_MS = 400;

const BorrowReturn: React.FC = () => {
  /* --------------------------- Состояния -------------------------- */
  const [actionType, setActionType] = useState<ActionType>('borrow');
  const [rawSearch, setRawSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<SearchColumn>('localIndex');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [books, setBooks] = useState<Book[]>([]);
  const [modalBookId, setModalBookId] = useState<number | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  /* ----------------------------- API ------------------------------ */
  /* загружаем список людей один раз */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await httpClient.get<Person[]>('/persons');
        setPersons(data);
      } catch (err) {
        console.error('Ошибка при получении людей:', err);
      }
    })();
  }, []);

  /* ——— запрос книг ——— */
  const fetchBooks = useCallback(
    async (signal?: AbortSignal) => {
      const p = new URLSearchParams();
      p.append('search', rawSearch.trim());
      p.append('searchColumn', searchColumn);
      p.append('page', String(page));
      p.append('limit', String(limit));

      /* автоматическая фильтрация по типу действия */
      if (actionType === 'borrow') {
        p.append('onlyAvailable', 'true');
      } else {
        p.append('onlyIssued', 'true');
      }

      try {
        const { data } = await httpClient.get<PaginatedResponse<Book>>(
          `/books/paginated?${p.toString()}`,
          { signal },
        );
        setBooks(data.data);
        setTotalPages(Math.max(1, Math.ceil(data.total / limit)));
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          console.error('Ошибка при поиске книг:', err);
          setBooks([]);
          setTotalPages(1);
          toast.error('Не удалось загрузить список книг');
        }
      }
    },
    [rawSearch, searchColumn, page, limit, actionType],
  );

  /* ─── дебаунсим запрос книг ─── */
  useEffect(() => {
    const ctrl = new AbortController();
    const tId = setTimeout(() => fetchBooks(ctrl.signal), DEBOUNCE_MS);

    return () => {
      clearTimeout(tId);
      ctrl.abort();
    };
  }, [rawSearch, searchColumn, page, limit, actionType, reloadToken, fetchBooks]);

  /* -------------------------- Форматтеры -------------------------- */
  const fmtAuthors = (authors: Author[] | null) =>
    authors?.length
      ? authors
          .map(
            a =>
              `${a.lastName}${a.firstName ? ` ${a.firstName}` : ''}${
                a.patronymic ? ` ${a.patronymic}` : ''
              }`,
          )
          .join(', ')
      : '(нет авторов)';

  /* ---------------------------- UI ------------------------------- */
  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Выдача / Возврат</h2>

      {/* ─── Панель поиска ─── */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        {/* действие */}
        <select
          value={actionType}
          onChange={e => {
            setActionType(e.target.value as ActionType);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm pr-8"
        >
          <option value="borrow">Выдать</option>
          <option value="return">Принять</option>
        </select>

        {/* колонка поиска */}
        <select
          value={searchColumn}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setSearchColumn(e.target.value as SearchColumn);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm pr-8"
        >
          {COLUMNS.map(c => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        {/* строка поиска */}
        <input
          type="text"
          placeholder="Введите запрос…"
          value={rawSearch}
          onChange={e => {
            setRawSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm flex-1 min-w-[160px]"
        />
      </div>

      {/* ─── Карточки книг ─── */}
      {books.length ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {books.map(b => (
            <div
              key={b.id}
              className={clsx(
                'border rounded p-3 cursor-pointer transition hover:bg-gray-300',
              )}
              onClick={() => setModalBookId(b.id)}
            >
              <h4 className="font-semibold text-sm mb-1">
                {b.title || '(без названия)'}
              </h4>
              <p className="text-xs mb-1">{fmtAuthors(b.authors)}</p>
              <p className="text-xs">Индекс: {b.localIndex || '—'}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Ничего не найдено</p>
      )}

      {/* ─── Пагинация ─── */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={p => setPage(p)}
        onLimitChange={l => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* ─── Модальное окно с деталями и действиями ─── */}
      <BorrowDetailsModal
        bookId={modalBookId}
        actionType={actionType}
        onClose={() => setModalBookId(null)}
        onDone={() => setReloadToken(v => v + 1)}
      />
    </div>
  );
};

export default BorrowReturn;