import React, {
  useState,
  useEffect,
  useCallback,
  ChangeEvent,
} from 'react';
import clsx from 'clsx';
import { Book, PaginatedResponse, Author } from '../utils/interfaces.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { toast } from 'react-toastify';
import Pagination from '../components/Pagination.tsx';
import BorrowDetailsModal from '../components/BorrowDetailsModal.tsx';

type ActionType = 'borrow' | 'return';

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
type SearchColumn = (typeof COLUMNS)[number]['key'];

const DEBOUNCE_MS = 400;

const BorrowReturn: React.FC = () => {
  const [actionType, setActionType] = useState<ActionType>('borrow');
  const [rawSearch, setRawSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<SearchColumn>('title');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [books, setBooks] = useState<Book[]>([]);
  const [modalBookId, setModalBookId] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Функция форматирования списка авторов
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

  // Получение книг с учётом фильтров
  const fetchBooks = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams();
      params.append('search', rawSearch.trim());
      params.append('searchColumn', searchColumn);
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (actionType === 'borrow') params.append('onlyAvailable', 'true');
      else params.append('onlyIssued', 'true');

      try {
        const { data } = await httpClient.get<PaginatedResponse<Book>>(
          `/books/paginated?${params.toString()}`,
          { signal },
        );

        const newTotalPages = Math.max(1, Math.ceil(data.total / limit));

        setBooks(data.data);
        setTotalPages(newTotalPages);

        // Если текущая страница вышла за пределы диапазона, смещаем
        setPage(prev => (prev > newTotalPages ? newTotalPages : prev));
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

  // Дебаунс-эффект для запроса данных
  useEffect(() => {
    const ctrl = new AbortController();
    const tId = setTimeout(() => fetchBooks(ctrl.signal), DEBOUNCE_MS);
    return () => {
      clearTimeout(tId);
      ctrl.abort();
    };
  }, [rawSearch, searchColumn, page, limit, actionType, reloadToken, fetchBooks]);

  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Выдача / Возврат</h2>

      {/* Панель фильтров */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
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

      {/* Список книг */}
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
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Ничего не найдено</p>
      )}

      {/* Пагинация: всегда отображается, даже при одной странице */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={l => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* Модальное окно для выдачи / возврата */}
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