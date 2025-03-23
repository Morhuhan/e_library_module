import React, { useState, useEffect } from 'react';
import { Book, BookCopy, BorrowRecord } from '../interfaces';
import httpClient from '../utils/httpsClient.tsx';

interface PaginatedBooks {
  data: Book[];
  total: number;
  page: number;
  limit: number;
}

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
      const resp = await httpClient.get<PaginatedBooks>('/books/paginated', {
        params: {
          search: searchValue,
          onlyAvailable: onlyAvailable ? 'true' : 'false',
          page: String(newPage),
          limit: String(newLimit),
        },
      });
      setBooks(resp.data.data);
      setTotal(resp.data.total);
      setLimit(resp.data.limit);
    } catch (error) {
      console.error('Ошибка при загрузке списка книг:', error);
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
    return book.bookCopies?.some(copy => {
      const activeBorrow = copy.borrowRecords?.find(r => r.returnDate === null);
      return !activeBorrow; 
    }) || false;
  };


  const toggleExpandBook = (bookId: number) => {
    setExpandedBookIds(prev => {
      if (prev.includes(bookId)) {
        return prev.filter(id => id !== bookId);
      } else {
        return [...prev, bookId];
      }
    });
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
    const bookId = selectedBookForEdit.id;

    try {
      await httpClient.put(`/books/${bookId}`, {
        title: editTitle,
      });
      await fetchBooks(page, limit);
      closeEditModal();
    } catch (error) {
      console.error('Ошибка при сохранении изменений:', error);
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
    const bookId = selectedBookForDelete.id;

    try {
      await httpClient.delete(`/books/${bookId}`);
      await fetchBooks(page, limit);
      closeDeleteModal(); 
    } catch (error) {
      console.error('Ошибка при удалении книги:', error);
      closeDeleteModal();
    }
  };

  const getCopyStatus = (copy: BookCopy) => {
    const activeBorrow = copy.borrowRecords?.find(r => r.returnDate === null);
    if (activeBorrow) {

      const borrowDate = activeBorrow.borrowDate || '—';
      return `Выдан (с ${borrowDate} до ?)`;
    } else {
      return 'В наличии';
    }
  };

  return (
    <div>
      <h2>Список книг (пагинация)</h2>

      <div>
        <input
          type="text"
          placeholder="Поиск по названию книги..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => setOnlyAvailable(e.target.checked)}
          />
          Показать только книги, где есть доступные экземпляры
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Редакция</th>
            <th>Изд. заявление</th>
            <th>Инф. о публиковании</th>
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
          {books.length > 0 ? (
            books.map(book => {
              const available = isBookAvailable(book);
              const isExpanded = expandedBookIds.includes(book.id);

              return (
                <React.Fragment key={book.id}>
                  <tr onClick={() => toggleExpandBook(book.id)}>
                    <td>{book.title || '—'}</td>
                    <td>{book.bookType || '—'}</td>
                    <td>{book.edit || '—'}</td>
                    <td>{book.editionStatement || '—'}</td>
                    <td>{book.pubInfo || '—'}</td>
                    <td>{book.physDesc || '—'}</td>
                    <td>{book.series || '—'}</td>
                    <td>{book.udc || '—'}</td>
                    <td>{book.bbk || '—'}</td>
                    <td>{book.localIndex || '—'}</td>
                    <td>{book.authors || '—'}</td>
                    <td>
                      {available ? 'Есть доступные экземпляры' : 'Нет в наличии'}
                    </td>
                    <td>
                      <button onClick={(e) => openEditModal(book, e)}>
                        Редактировать
                      </button>
                      <button onClick={(e) => openDeleteModal(book, e)}>
                        Удалить
                      </button>
                    </td>
                  </tr>

                  {isExpanded && book.bookCopies && book.bookCopies.length > 0 && (
                    book.bookCopies.map(copy => (
                      <tr key={copy.id}>
                        <td colSpan={13} style={{ paddingLeft: '2em' }}>
                          <strong>Экземпляр ID {copy.id}</strong>
                          {copy.copyInfo ? `: ${copy.copyInfo}` : ''}

                          <div style={{ marginTop: '0.5rem' }}>
                            {getCopyStatus(copy)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={13}>Нет книг, удовлетворяющих условиям</td>
            </tr>
          )}
        </tbody>
      </table>

      <div>
        <button
          onClick={() => setPage(prev => Math.max(prev - 1, 1))}
          disabled={page <= 1}
        >
          Предыдущая
        </button>
        <span>
          Страница {page} из {totalPages || 1}
        </span>
        <button
          onClick={() => setPage(prev => (prev < totalPages ? prev + 1 : prev))}
          disabled={page >= totalPages || totalPages === 0}
        >
          Следующая
        </button>
        <select
          value={limit}
          onChange={e => {
            const newLimit = parseInt(e.target.value, 10) || 10;
            setLimit(newLimit);
            setPage(1);
          }}
        >
          <option value="5">5 на странице</option>
          <option value="10">10 на странице</option>
          <option value="20">20 на странице</option>
        </select>
      </div>

      {isEditModalOpen && selectedBookForEdit && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h3>Редактировать книгу (ID: {selectedBookForEdit.id})</h3>
            <div>
              <label>Название: </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

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
            <h3>Подтверждение удаления</h3>
            <p>
              Вы действительно хотите удалить книгу 
              &laquo;{selectedBookForDelete.title || '—'}&raquo; 
              (ID: {selectedBookForDelete.id})?
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