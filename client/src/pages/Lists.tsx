import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import type { Book, BookCopy, PaginatedResponse } from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';

const Lists: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [expandedBookIds, setExpandedBookIds] = useState<number[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBookForDelete, setSelectedBookForDelete] = useState<Book | null>(null);

  const fetchBooks = async (newPage = 1, newLimit = 10) => {
    try {
      const res = await httpClient.get<PaginatedResponse<Book>>('/books/paginated', {
        params: {
          search: searchValue,
          onlyAvailable: onlyAvailable ? 'true' : 'false',
          page: String(newPage),
          limit: String(newLimit),
        },
      });
      setBooks(res.data.data);
      setTotal(res.data.total);
      setLimit(res.data.limit);
      setPage(res.data.page);
    } catch (err) {
      console.error('Ошибка при загрузке книг:', err);
    }
  };

  useEffect(() => {
    fetchBooks(page, limit);
  }, [page, limit]);

  useEffect(() => {
    setPage(1);
    fetchBooks(1, limit);
  }, [searchValue, onlyAvailable]);

  const totalPages = Math.ceil(total / limit);

  const isBookAvailable = (book: Book) => {
    return book.bookCopies?.some((c) => !c.borrowRecords?.some((r) => !r.returnDate)) || false;
  };

  const toggleExpandBook = (bookId: number) => {
    setExpandedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const openEditModal = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBookForEdit(book);
    setEditTitle(book.title || '');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedBookForEdit(null);
    setEditTitle('');
  };

  const handleEditSave = async () => {
    if (!selectedBookForEdit) return;
    try {
      await httpClient.put(`/books/${selectedBookForEdit.id}`, { title: editTitle });
      await fetchBooks(page, limit);
      closeEditModal();
    } catch (err) {
      console.error('Ошибка при сохранении изменений:', err);
      closeEditModal();
    }
  };

  const openDeleteModal = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBookForDelete(book);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedBookForDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedBookForDelete) return;
    try {
      await httpClient.delete(`/books/${selectedBookForDelete.id}`);
      await fetchBooks(page, limit);
      closeDeleteModal();
    } catch (err) {
      console.error('Ошибка при удалении книги:', err);
      closeDeleteModal();
    }
  };

  const getCopyStatus = (copy: BookCopy) => {
    const active = copy.borrowRecords?.find((r) => !r.returnDate);
    return active ? `Выдан (с ${active.borrowDate || '—'})` : 'В наличии';
  };

  return (
    <div>
      <h2>Список книг (пагинация)</h2>
      <div>
        <input
          type="text"
          placeholder="Поиск..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Только доступные
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Редакция</th>
            <th>Изд. заявление</th>
            <th>Публикация</th>
            <th>Физ. описание</th>
            <th>Серия</th>
            <th>УДК</th>
            <th>ББК</th>
            <th>Лок. индекс</th>
            <th>Авторы</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {books.length ? (
            books.map((b) => {
              const available = isBookAvailable(b);
              const expanded = expandedBookIds.includes(b.id);
              return (
                <React.Fragment key={b.id}>
                  <tr onClick={() => toggleExpandBook(b.id)}>
                    <td>{b.title || '—'}</td>
                    <td>{b.bookType || '—'}</td>
                    <td>{b.edit || '—'}</td>
                    <td>{b.editionStatement || '—'}</td>
                    <td>{b.pubInfo || '—'}</td>
                    <td>{b.physDesc || '—'}</td>
                    <td>{b.series || '—'}</td>
                    <td>{b.udc || '—'}</td>
                    <td>{b.bbk || '—'}</td>
                    <td>{b.localIndex || '—'}</td>
                    <td>{b.authors || '—'}</td>
                    <td>{available ? 'Есть в наличии' : 'Нет в наличии'}</td>
                    <td>
                      <button onClick={(e) => openEditModal(b, e)}>Ред.</button>
                      <button onClick={(e) => openDeleteModal(b, e)}>Удл.</button>
                    </td>
                  </tr>
                  {expanded &&
                    b.bookCopies?.map((c) => (
                      <tr key={c.id}>
                        <td colSpan={13} style={{ paddingLeft: '2em' }}>
                          <strong>Экземпляр {c.id}</strong>
                          {c.copyInfo ? `: ${c.copyInfo}` : ''}
                          <div>{getCopyStatus(c)}</div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={13}>Нет книг</td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {isEditModalOpen && selectedBookForEdit && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h3>Редактировать (ID: {selectedBookForEdit.id})</h3>
            <label>Название:</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleEditSave}>Сохранить</button>
              <button onClick={closeEditModal} style={{ marginLeft: '0.5rem' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedBookForDelete && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h3>Удалить книгу?</h3>
            <p>
              {selectedBookForDelete.title} (ID: {selectedBookForDelete.id})
            </p>
            <div>
              <button onClick={handleDelete}>Удалить</button>
              <button onClick={closeDeleteModal} style={{ marginLeft: '0.5rem' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '1rem',
  borderRadius: '6px',
  width: '400px',
  maxWidth: '90%',
};

export default Lists;