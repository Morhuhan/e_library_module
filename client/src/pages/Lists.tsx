import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import type {
  Book,
  BookCopy,
  PaginatedResponse,
  BookBbkRaw,
  BookUdcRaw,
} from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';
import Modal from '../components/Modal.tsx';

const DEBOUNCE_MS = 300;

/* ---------- модальные типы ---------- */
interface EditModalProps {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
  onSaved: () => void;
}
interface DeleteModalProps {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
  onDeleted: () => void;
}

/* ---------- редактируемые поля и их подписи ---------- */
const editableFields = [
  'title',
  'localIndex',
  'bookType',
  'edit',
  'editionStatement',
  'series',
  'physDesc',
] as const;

const fieldLabels: Record<typeof editableFields[number], string> = {
  title:            'Название',
  localIndex:       'Индекс',
  bookType:         'Тип',
  edit:             'Редактор',
  editionStatement: 'Сведения об изд.',
  series:           'Серия',
  physDesc:         'Страницы',
};

/* ---------- Модалка редактирования ---------- */
const EditBookModal: React.FC<EditModalProps> = ({ visible, book, onClose, onSaved }) => {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (book) {
      const init: Record<string, string> = {};
      editableFields.forEach(f => { init[f] = (book as any)[f] ?? ''; });
      setForm(init);
    }
  }, [book]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!book) return;
    try {
      const payload: Partial<Book> = {};
      editableFields.forEach(f => { (payload as any)[f] = form[f] || null; });
      await httpClient.put(`/books/${book.id}`, payload);
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Ошибка сохранения');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <h3 className="text-lg font-semibold mb-4">Редактировать книгу №{book?.id}</h3>

      {editableFields.map(f => (
        <div key={f} className="mb-3">
          <label className="block text-sm mb-1">{fieldLabels[f]}</label>
          <input
            type="text"
            name={f}
            value={form[f] ?? ''}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
      ))}

      <div className="flex justify-end gap-2 mt-4">
        <button className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300" onClick={onClose}>
          Отмена
        </button>
        <button className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" onClick={handleSubmit}>
          Сохранить
        </button>
      </div>
    </Modal>
  );
};

/* ---------- Модалка удаления ---------- */
const DeleteConfirmModal: React.FC<DeleteModalProps> = ({ visible, book, onClose, onDeleted }) => {
  const handleDelete = async () => {
    if (!book) return;
    try {
      await httpClient.delete(`/books/${book.id}`);
      onDeleted();
    } catch (err) {
      console.error(err);
      alert('Не удалось удалить книгу');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <h3 className="text-lg font-semibold mb-4">Удалить книгу №{book?.id}?</h3>
      <p className="text-sm mb-4">Действие нельзя отменить.</p>
      <div className="flex justify-end gap-2">
        <button className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300" onClick={onClose}>
          Отмена
        </button>
        <button className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
          Удалить
        </button>
      </div>
    </Modal>
  );
};

const Lists: React.FC = () => {
  /* ---------------- state ---------------- */
  const [searchValue, setSearchValue]   = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [onlyAvailable, setOnlyAvail]   = useState(false);

  const [page,  setPage]  = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [books, setBooks]              = useState<Book[]>([]);
  const [expandedBookIds, setExpanded] = useState<number[]>([]);
  const [loading, setLoading]          = useState(false);
  const [errorMessage, setError]       = useState('');

  /* модалки */
  const [editVisible,   setEditVisible]   = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedBook,  setSelectedBook]  = useState<Book | null>(null);

  /* ---------------- helpers ---------------- */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fmtPubPlaces = (pl: Book['publicationPlaces']) =>
    (pl ?? [])
      .map(p => [p.city, p.publisher?.name, p.pubYear].filter(Boolean).join(', '))
      .join('; ') || '—';

  const fmtAuthors = (a: Book['authors']) => (a ?? []).map(x => x.fullName).join('; ') || '—';

  const fmtCodes = (arr: { bbkAbb?: string; udcAbb?: string }[] | null) =>
    (arr ?? []).map(x => ('bbkAbb' in x ? x.bbkAbb : x.udcAbb)).join(', ') || '—';

  const fmtRawCodes = <T extends { bbkCode?: string; udcCode?: string }>(
    arr: T[] | null | undefined,
    field: 'bbkCode' | 'udcCode',
  ) => (arr ?? []).map(x => x[field]).join(', ') || '—';

  /* ---------------- data fetching ---------------- */
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await httpClient.get<PaginatedResponse<Book>>('/books/paginated', {
        params: {
          search:        debouncedSearch,
          onlyAvailable: String(onlyAvailable),
          page,
          limit,
        },
      });
      setBooks(res.data.data);
      setTotal(res.data.total);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Не удалось загрузить книги. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, onlyAvailable, page, limit]);

  /* эффекты */
  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { const id = setTimeout(() => setDebounced(searchValue), DEBOUNCE_MS); return () => clearTimeout(id); }, [searchValue]);
  useEffect(() => setPage(1), [debouncedSearch, onlyAvailable, limit]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => setExpanded([]), [books]);

  /* toggle раскрытия */
  const toggleExpand = (id: number) =>
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  /* ---------------- render ---------------- */
  return (
    <div className="container mx-auto px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Список книг</h2>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {errorMessage}
        </div>
      )}

      {/* фильтры */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Поиск (назв., авторы, индекс)…"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => setOnlyAvail(e.target.checked)}
          />
          Только доступные
        </label>
      </div>

      {/* таблица */}
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] text-sm border-collapse border-2 border-gray-400">
          <thead className="bg-gray-100">
            <tr>
              {['#','Индекс','Заголовок','Авторы','Тип','Редакция','Серия','Страницы',
                'ББК','УДК','ББК*','УДК*','Издательство','Действия']
                .map(h => <th key={h} className="p-2 border">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="p-4 text-center">Загрузка…</td></tr>
            ) : books.length ? (
              books.map((book, idx) => {
                const expanded = expandedBookIds.includes(book.id);
                const copies   = book.bookCopies ?? [];

                return (
                  <React.Fragment key={book.id}>
                    <tr
                      onClick={() => toggleExpand(book.id)}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="p-2 border text-center">{idx + 1 + (page - 1) * limit}</td>
                      <td className="p-2 border">{book.localIndex ?? '—'}</td>
                      <td className="p-2 border font-medium">{book.title ?? '—'}</td>
                      <td className="p-2 border">{fmtAuthors(book.authors)}</td>
                      <td className="p-2 border">{book.bookType ?? '—'}</td>
                      <td className="p-2 border">
                        {book.edit ?? '—'}{book.editionStatement ? `, ${book.editionStatement}` : ''}
                      </td>
                      <td className="p-2 border">{book.series ?? '—'}</td>
                      <td className="p-2 border">{book.physDesc ?? '—'}</td>
                      <td className="p-2 border">{fmtCodes(book.bbks)}</td>
                      <td className="p-2 border">{fmtCodes(book.udcs)}</td>
                      <td className="p-2 border">
                        {fmtRawCodes<BookBbkRaw>(book.bbkRaws, 'bbkCode')}
                      </td>
                      <td className="p-2 border">
                        {fmtRawCodes<BookUdcRaw>(book.udcRaws, 'udcCode')}
                      </td>
                      <td className="p-2 border">{fmtPubPlaces(book.publicationPlaces)}</td>
                      <td
                        className="p-2 border text-center space-x-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => { setSelectedBook(book); setEditVisible(true); }}
                        >
                          Изм
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => { setSelectedBook(book); setDeleteVisible(true); }}
                        >
                          Удл
                        </button>
                      </td>
                    </tr>

                    {expanded && copies.map(copy => (
                      <tr key={copy.id}>
                        <td colSpan={14} className="p-2 border pl-6 bg-gray-50">
                          <strong>Экземпляр {copy.id}</strong>
                          {copy.copyInfo ? `: ${copy.copyInfo}` : ''}
                          <div className="text-xs text-gray-700 mt-1">
                            {(copy.borrowRecords ?? []).some(r => !r.returnDate) ? 'Выдан' : 'В наличии'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            ) : (
              <tr><td colSpan={14} className="p-2 border text-center">Нет книг</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* пагинация */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={p => { window.scrollTo({ top: 0, behavior: 'smooth' }); setPage(p); }}
        onLimitChange={newLimit => { if (newLimit !== limit) { setLimit(newLimit); setPage(1); } }}
      />

      {/* модалки */}
      <EditBookModal
        visible={editVisible}
        book={selectedBook}
        onClose={() => setEditVisible(false)}
        onSaved={() => { setEditVisible(false); fetchBooks(); }}
      />
      <DeleteConfirmModal
        visible={deleteVisible}
        book={selectedBook}
        onClose={() => setDeleteVisible(false)}
        onDeleted={() => { setDeleteVisible(false); fetchBooks(); }}
      />
    </div>
  );
};

export default Lists;